-- LvlMe 0006: Kurzbefehl robuster machen
-- Problem: Wenn ein Health-Wert heute fehlt (z. B. keine Trainingsminuten), schickt der
-- Kurzbefehl "" statt einer Zahl -> Fehler 22P02. Außerdem schreibt ein deutsches iPhone
-- Kommazahlen manchmal als "412,5".
-- Lösung: Die Funktion nimmt die Zahlen als Text an, leere Werte werden 0 bzw. leer,
-- Komma wird zu Punkt. Darf mehrfach laufen.

drop function if exists public.ingest_health_metrics(text, date, integer, numeric, numeric, numeric, numeric, numeric);
drop function if exists public.ingest_health_metrics(text, text, text, text, text, text, text, text);

create or replace function public._lvlme_num(p text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p is null then null
    when btrim(p) = '' then null
    else nullif(regexp_replace(replace(btrim(p), ',', '.'), '[^0-9.\-]', '', 'g'), '')::numeric
  end;
$$;

create or replace function public.ingest_health_metrics(
  p_token               text,
  p_date                text,
  p_steps               text default null,
  p_active_energy_kcal  text default null,
  p_workout_minutes     text default null,
  p_sleep_hours         text default null,
  p_hrv_ms              text default null,
  p_resting_hr          text default null
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
    sleep_hours, hrv_ms, resting_hr, source, updated_at
  ) values (
    v_uid, v_date,
    greatest(round(coalesce(public._lvlme_num(p_steps), 0)), 0)::integer,
    greatest(coalesce(public._lvlme_num(p_active_energy_kcal), 0), 0),
    greatest(coalesce(public._lvlme_num(p_workout_minutes), 0), 0),
    public._lvlme_num(p_sleep_hours),
    public._lvlme_num(p_hrv_ms),
    public._lvlme_num(p_resting_hr),
    'shortcut', now()
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

revoke execute on function public._lvlme_num(text) from public, anon, authenticated;
revoke execute on function public.ingest_health_metrics(text, text, text, text, text, text, text, text) from public, authenticated;
grant  execute on function public.ingest_health_metrics(text, text, text, text, text, text, text, text) to anon;

notify pgrst, 'reload schema';
