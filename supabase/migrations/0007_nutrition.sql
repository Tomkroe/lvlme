-- LvlMe 0007: Ernährung (Kalorien, Protein, Wasser)
-- Im Supabase SQL Editor ausführen, nachdem 0001–0006 gelaufen sind. Darf mehrfach laufen.
--
-- Spielregel (siehe CLAUDE.md): Wenig essen wird NIE belohnt. Die Werte sind nur zur
-- Übersicht; XP gibt es höchstens fürs Erfassen und für genug Wasser.

alter table public.health_metrics
  add column if not exists dietary_energy_kcal numeric check (dietary_energy_kcal is null or dietary_energy_kcal >= 0),
  add column if not exists protein_g           numeric check (protein_g is null or protein_g >= 0),
  add column if not exists water_ml            numeric check (water_ml is null or water_ml >= 0);

-- ---------------------------------------------------------------------------
-- Lesen: jetzt inkl. Ernährung (Rückgabetyp ändert sich -> neu anlegen)
-- ---------------------------------------------------------------------------
drop function if exists public.get_health_metrics(integer);
create function public.get_health_metrics(p_days integer default 60)
returns table (
  date                 date,
  steps                integer,
  active_energy_kcal   numeric,
  workout_minutes      numeric,
  sleep_hours          numeric,
  hrv_ms               numeric,
  resting_hr           numeric,
  source               text,
  dietary_energy_kcal  numeric,
  protein_g            numeric,
  water_ml             numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select h.date, h.steps, h.active_energy_kcal, h.workout_minutes,
         h.sleep_hours, h.hrv_ms, h.resting_hr, h.source,
         h.dietary_energy_kcal, h.protein_g, h.water_ml
  from public.health_metrics h
  where h.user_id = auth.uid()
    and h.date >= (current_date - greatest(coalesce(p_days, 60), 1))
  order by h.date asc;
$$;
revoke execute on function public.get_health_metrics(integer) from public, anon;
grant  execute on function public.get_health_metrics(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Kurzbefehl: zusätzlich Ernährung annehmen (alles optional, als Text wie in 0006)
-- Fehlen die Ernährungsfelder, bleiben von Hand eingetragene Werte erhalten.
-- ---------------------------------------------------------------------------
drop function if exists public.ingest_health_metrics(text, text, text, text, text, text, text, text);
drop function if exists public.ingest_health_metrics(text, text, text, text, text, text, text, text, text, text, text);
create function public.ingest_health_metrics(
  p_token                text,
  p_date                 text,
  p_steps                text default null,
  p_active_energy_kcal   text default null,
  p_workout_minutes      text default null,
  p_sleep_hours          text default null,
  p_hrv_ms               text default null,
  p_resting_hr           text default null,
  p_dietary_energy_kcal  text default null,
  p_protein_g            text default null,
  p_water_ml             text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid  uuid;
  v_date date;
begin
  select user_id into v_uid from public.device_tokens where token = btrim(p_token);
  if v_uid is null then
    raise exception 'Ungültiges Token.' using errcode = '28000';
  end if;

  v_date := coalesce(nullif(btrim(p_date), '')::date, current_date);

  insert into public.health_metrics (
    user_id, date, steps, active_energy_kcal, workout_minutes,
    sleep_hours, hrv_ms, resting_hr,
    dietary_energy_kcal, protein_g, water_ml,
    source, updated_at
  ) values (
    v_uid, v_date,
    greatest(round(coalesce(public._lvlme_num(p_steps), 0)), 0)::integer,
    greatest(coalesce(public._lvlme_num(p_active_energy_kcal), 0), 0),
    greatest(coalesce(public._lvlme_num(p_workout_minutes), 0), 0),
    public._lvlme_num(p_sleep_hours),
    public._lvlme_num(p_hrv_ms),
    public._lvlme_num(p_resting_hr),
    nullif(public._lvlme_num(p_dietary_energy_kcal), 0),
    nullif(public._lvlme_num(p_protein_g), 0),
    nullif(public._lvlme_num(p_water_ml), 0),
    'shortcut', now()
  )
  on conflict (user_id, date) do update set
    steps               = excluded.steps,
    active_energy_kcal  = excluded.active_energy_kcal,
    workout_minutes     = excluded.workout_minutes,
    sleep_hours         = coalesce(excluded.sleep_hours, public.health_metrics.sleep_hours),
    hrv_ms              = coalesce(excluded.hrv_ms, public.health_metrics.hrv_ms),
    resting_hr          = coalesce(excluded.resting_hr, public.health_metrics.resting_hr),
    dietary_energy_kcal = coalesce(excluded.dietary_energy_kcal, public.health_metrics.dietary_energy_kcal),
    protein_g           = coalesce(excluded.protein_g, public.health_metrics.protein_g),
    water_ml            = coalesce(excluded.water_ml, public.health_metrics.water_ml),
    source              = 'shortcut',
    updated_at          = now();
end;
$$;
revoke execute on function public.ingest_health_metrics(text, text, text, text, text, text, text, text, text, text, text) from public, authenticated;
grant  execute on function public.ingest_health_metrics(text, text, text, text, text, text, text, text, text, text, text) to anon;

-- ---------------------------------------------------------------------------
-- Von Hand: nur Ernährung eintragen, ohne Schritte usw. anzufassen
-- ---------------------------------------------------------------------------
create or replace function public.upsert_nutrition(
  p_date                 date,
  p_dietary_energy_kcal  numeric default null,
  p_protein_g            numeric default null,
  p_water_ml             numeric default null
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

  insert into public.health_metrics (user_id, date, dietary_energy_kcal, protein_g, water_ml, source, updated_at)
  values (v_uid, coalesce(p_date, current_date),
          nullif(greatest(p_dietary_energy_kcal, 0), 0),
          nullif(greatest(p_protein_g, 0), 0),
          nullif(greatest(p_water_ml, 0), 0),
          'manual', now())
  on conflict (user_id, date) do update set
    dietary_energy_kcal = excluded.dietary_energy_kcal,
    protein_g           = excluded.protein_g,
    water_ml            = excluded.water_ml,
    updated_at          = now();
end;
$$;
revoke execute on function public.upsert_nutrition(date, numeric, numeric, numeric) from public, anon;
grant  execute on function public.upsert_nutrition(date, numeric, numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
