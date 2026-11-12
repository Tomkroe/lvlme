-- LvlMe: Gesundheitswerte für die Webversion
-- Im Supabase-Dashboard unter "SQL Editor" ausführen, nachdem 0001–0003 gelaufen sind.
--
-- Hintergrund: Die Webversion kann nicht direkt auf Apple Health zugreifen (das
-- erlaubt Apple keinem Browser). Die Werte kommen stattdessen über einen
-- Apple-Kurzbefehl, der täglich per HTTP-POST hierher sendet – oder über die
-- manuelle Eingabe in der Webversion.
--
-- Ein Kurzbefehl kann sich nicht wie die App per Login ausweisen (kein
-- Apple-/E-Mail-Login im Kurzbefehl). Stattdessen bekommt jede Person ein
-- einziges, langes Geheim-Token (siehe create_device_token), das nur für das
-- Einspeisen von Tageswerten gilt – nicht für Login, Freunde oder irgendetwas
-- anderes. Das Token kann jederzeit in der Webversion neu erzeugt werden,
-- wodurch das alte ungültig wird.

create table if not exists public.device_tokens (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.health_metrics (
  user_id             uuid not null references auth.users (id) on delete cascade,
  date                date not null,
  steps               integer not null default 0 check (steps >= 0),
  active_energy_kcal  numeric not null default 0 check (active_energy_kcal >= 0),
  workout_minutes     numeric not null default 0 check (workout_minutes >= 0),
  sleep_hours         numeric check (sleep_hours is null or sleep_hours between 0 and 24),
  hrv_ms              numeric check (hrv_ms is null or hrv_ms >= 0),
  resting_hr          numeric check (resting_hr is null or resting_hr >= 0),
  source              text not null default 'manual' check (source in ('manual', 'shortcut')),
  updated_at          timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.device_tokens  enable row level security;
alter table public.health_metrics enable row level security;

-- Niemand liest oder schreibt diese Tabellen direkt – nur über die Funktionen unten.
revoke all on public.device_tokens, public.health_metrics from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: eigenes Geheim-Token erzeugen/erneuern (nur angemeldet, z. B. in der Webversion)
-- ---------------------------------------------------------------------------
create or replace function public.create_device_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if v_uid is null then
    raise exception 'Bitte melde dich zuerst an.' using errcode = '28000';
  end if;

  insert into public.device_tokens (user_id, token)
  values (v_uid, v_token)
  on conflict (user_id) do update set token = v_token, created_at = now();

  return v_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: Tageswerte per Token einspeisen (vom Kurzbefehl aufgerufen, ohne Login)
-- ---------------------------------------------------------------------------
create or replace function public.ingest_health_metrics(
  p_token               text,
  p_date                date,
  p_steps               integer,
  p_active_energy_kcal  numeric,
  p_workout_minutes     numeric,
  p_sleep_hours         numeric default null,
  p_hrv_ms              numeric default null,
  p_resting_hr          numeric default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  select user_id into v_uid from public.device_tokens where token = p_token;
  if v_uid is null then
    raise exception 'Ungültiges Token.' using errcode = '28000';
  end if;

  insert into public.health_metrics (
    user_id, date, steps, active_energy_kcal, workout_minutes,
    sleep_hours, hrv_ms, resting_hr, source, updated_at
  ) values (
    v_uid, p_date, coalesce(p_steps, 0), coalesce(p_active_energy_kcal, 0), coalesce(p_workout_minutes, 0),
    p_sleep_hours, p_hrv_ms, p_resting_hr, 'shortcut', now()
  )
  on conflict (user_id, date) do update set
    steps              = excluded.steps,
    active_energy_kcal = excluded.active_energy_kcal,
    workout_minutes    = excluded.workout_minutes,
    sleep_hours        = excluded.sleep_hours,
    hrv_ms             = excluded.hrv_ms,
    resting_hr         = excluded.resting_hr,
    source             = 'shortcut',
    updated_at         = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: eigene Tageswerte manuell eintragen/ändern (angemeldet, z. B. in der Webversion)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_health_metrics(
  p_date                date,
  p_steps               integer,
  p_active_energy_kcal  numeric,
  p_workout_minutes     numeric,
  p_sleep_hours         numeric default null,
  p_hrv_ms              numeric default null,
  p_resting_hr          numeric default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Bitte melde dich zuerst an.' using errcode = '28000';
  end if;

  insert into public.health_metrics (
    user_id, date, steps, active_energy_kcal, workout_minutes,
    sleep_hours, hrv_ms, resting_hr, source, updated_at
  ) values (
    v_uid, p_date, coalesce(p_steps, 0), coalesce(p_active_energy_kcal, 0), coalesce(p_workout_minutes, 0),
    p_sleep_hours, p_hrv_ms, p_resting_hr, 'manual', now()
  )
  on conflict (user_id, date) do update set
    steps              = excluded.steps,
    active_energy_kcal = excluded.active_energy_kcal,
    workout_minutes    = excluded.workout_minutes,
    sleep_hours        = excluded.sleep_hours,
    hrv_ms             = excluded.hrv_ms,
    resting_hr         = excluded.resting_hr,
    source             = 'manual',
    updated_at         = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: eigene Tageswerte der letzten N Tage lesen (angemeldet)
-- ---------------------------------------------------------------------------
create or replace function public.get_health_metrics(p_days integer default 60)
returns table (
  date                date,
  steps               integer,
  active_energy_kcal  numeric,
  workout_minutes     numeric,
  sleep_hours         numeric,
  hrv_ms              numeric,
  resting_hr          numeric,
  source              text
)
language sql
stable
security definer
set search_path = ''
as $$
  select h.date, h.steps, h.active_energy_kcal, h.workout_minutes,
         h.sleep_hours, h.hrv_ms, h.resting_hr, h.source
  from public.health_metrics h
  where h.user_id = auth.uid()
    and h.date >= (current_date - greatest(coalesce(p_days, 60), 1))
  order by h.date asc;
$$;

revoke execute on function public.create_device_token() from public, anon;
revoke execute on function public.ingest_health_metrics(text, date, integer, numeric, numeric, numeric, numeric, numeric) from public, authenticated;
revoke execute on function public.upsert_health_metrics(date, integer, numeric, numeric, numeric, numeric, numeric) from public, anon;
revoke execute on function public.get_health_metrics(integer) from public, anon;

grant execute on function public.create_device_token() to authenticated;
grant execute on function public.ingest_health_metrics(text, date, integer, numeric, numeric, numeric, numeric, numeric) to anon;
grant execute on function public.upsert_health_metrics(date, integer, numeric, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.get_health_metrics(integer) to authenticated;

comment on function public.ingest_health_metrics(text, date, integer, numeric, numeric, numeric, numeric, numeric) is
  'Für anon aufrufbar, weil der Apple-Kurzbefehl nicht eingeloggt ist. Die Sicherheit kommt vom langen, geheimen Token, nicht vom Login.';
