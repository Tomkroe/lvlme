-- LvlMe 0012: Sync zwischen iPhone-App und PC-Version (gleicher Code, Expo Web)
-- Im Supabase SQL Editor ausführen, nachdem 0001–0011 gelaufen sind. Darf mehrfach laufen.
--
-- Die iPhone-App lädt – nur wenn der Nutzer „Mit dem PC synchronisieren“ einschaltet –
-- ihre Tageswerte aus Apple Health in health_metrics (Quelle 'healthkit') und ihren
-- Fortschritt in user_progress. Die PC-Version liest beides über das eigene Konto.
-- Lesbar ist alles nur für den Nutzer selbst, nie für Freunde.

-- ---------------------------------------------------------------------------
-- 1) Neue Quelle 'healthkit' für Tageswerte
-- ---------------------------------------------------------------------------
alter table public.health_metrics drop constraint if exists health_metrics_source_check;
alter table public.health_metrics
  add constraint health_metrics_source_check check (source in ('manual', 'shortcut', 'healthkit'));

-- ---------------------------------------------------------------------------
-- 2) RPC: mehrere Tage auf einmal vom iPhone hochladen (angemeldet)
--    Ernährungswerte (0007) bleiben unberührt.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_health_days(p_days jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  d     jsonb;
  v_date date;
begin
  if v_uid is null then
    raise exception 'Bitte melde dich zuerst an.' using errcode = '28000';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 31 then
    raise exception 'Bitte höchstens 31 Tage auf einmal senden.' using errcode = '22023';
  end if;

  for d in select * from jsonb_array_elements(p_days) loop
    v_date := (d->>'date')::date;
    -- Nur plausible Tage: nicht in der Zukunft, höchstens 60 Tage alt
    continue when v_date is null or v_date > current_date + 1 or v_date < current_date - 60;

    insert into public.health_metrics (
      user_id, date, steps, active_energy_kcal, workout_minutes,
      sleep_hours, hrv_ms, resting_hr, source, updated_at
    ) values (
      v_uid, v_date,
      greatest(coalesce((d->>'steps')::numeric, 0), 0)::integer,
      greatest(coalesce((d->>'active_energy_kcal')::numeric, 0), 0),
      greatest(coalesce((d->>'workout_minutes')::numeric, 0), 0),
      case when (d->>'sleep_hours')::numeric between 0 and 24 then (d->>'sleep_hours')::numeric end,
      case when (d->>'hrv_ms')::numeric >= 0 then (d->>'hrv_ms')::numeric end,
      case when (d->>'resting_hr')::numeric >= 0 then (d->>'resting_hr')::numeric end,
      'healthkit', now()
    )
    on conflict (user_id, date) do update set
      steps              = excluded.steps,
      active_energy_kcal = excluded.active_energy_kcal,
      workout_minutes    = excluded.workout_minutes,
      sleep_hours        = excluded.sleep_hours,
      hrv_ms             = excluded.hrv_ms,
      resting_hr         = excluded.resting_hr,
      source             = 'healthkit',
      updated_at         = now();
  end loop;
end;
$$;
revoke execute on function public.upsert_health_days(jsonb) from public, anon;
grant  execute on function public.upsert_health_days(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Fortschritt (Level, XP, Stats, Serie, gebuchte Tage) – nur für sich selbst
-- ---------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 32768),
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;
revoke all on public.user_progress from anon, authenticated;
grant select, insert, update on public.user_progress to authenticated;

drop policy if exists "own progress: read"   on public.user_progress;
drop policy if exists "own progress: insert" on public.user_progress;
drop policy if exists "own progress: update" on public.user_progress;
create policy "own progress: read"   on public.user_progress for select to authenticated using (user_id = auth.uid());
create policy "own progress: insert" on public.user_progress for insert to authenticated with check (user_id = auth.uid());
create policy "own progress: update" on public.user_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3b) Sync ausschalten = Einwilligung widerrufen: hochgeladene Daten löschen
--     (vom iPhone hochgeladene Tageswerte und den Fortschritt; Kurzbefehl-/Handeinträge bleiben)
-- ---------------------------------------------------------------------------
create or replace function public.clear_synced_data()
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
  -- Tage mit Ernährungswerten (0007) behalten, nur die Health-Werte entfernen
  update public.health_metrics h
     set steps = 0, active_energy_kcal = 0, workout_minutes = 0,
         sleep_hours = null, hrv_ms = null, resting_hr = null,
         source = 'manual', updated_at = now()
   where h.user_id = v_uid and h.source = 'healthkit'
     and (h.dietary_energy_kcal is not null or h.protein_g is not null or h.water_ml is not null);
  delete from public.health_metrics h where h.user_id = v_uid and h.source = 'healthkit';
  delete from public.user_progress up where up.user_id = v_uid;
end;
$$;
revoke execute on function public.clear_synced_data() from public, anon;
grant  execute on function public.clear_synced_data() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Konto löschen: Fortschritt ausdrücklich mitlöschen (wie 0005 für die Health-Tabellen)
-- ---------------------------------------------------------------------------
create or replace function public.delete_account()
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

  delete from public.user_progress up where up.user_id = v_uid;
  delete from public.health_metrics h where h.user_id = v_uid;
  delete from public.device_tokens  t where t.user_id = v_uid;
  delete from public.friendships f where v_uid in (f.user_a, f.user_b);
  delete from public.invites i_    where i_.owner = v_uid;
  delete from public.profiles p    where p.id = v_uid;
  delete from auth.users u         where u.id = v_uid;
end;
$$;
revoke execute on function public.delete_account() from public, anon;
grant  execute on function public.delete_account() to authenticated;
