-- LvlMe 0011: Frisur und Körper der iPhone-App (hair, body) im öffentlichen Avatar
-- Im Supabase SQL Editor ausführen, nachdem 0001–0010 gelaufen sind. Darf mehrfach laufen.
--
-- Baut auf 0009 (origin/main) auf: alle Prüfungen von dort bleiben unverändert, inklusive
-- "look" der Webversion. Neu sind zwei optionale Felder der iPhone-App (Bild-Ebenen):
--   hair: Frisur, ganze Zahl 0–6 (Index in HAIRSTYLES, src/avatar/assets.ts)
--   body: Körpertyp/Outfit, ganze Zahl 0–9 (Index in BODIES, src/avatar/assets.ts)
-- Beides sind reine Aussehensdaten, die der Nutzer selbst wählt, keine Gesundheitsdaten.
--
-- Die Check-Constraint auf profiles.avatar ruft die Funktion auf und muss nicht neu angelegt
-- werden: "create or replace" behält die Funktion (gleiche Signatur), neue Schreibvorgänge nutzen
-- sofort die neue Fassung. Die Prüfung erlaubt nur mehr als 0009, gespeicherte Zeilen bleiben gültig.
--
-- Hinweis: Auf dem Branch grundgeruest hieß diese Migration zuerst 0004_appearance.sql. Die Nummer
-- 0004 ist auf main schon vergeben (0004_web_health.sql), und jene Fassung kannte "look" nicht.

create or replace function public.is_public_avatar(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select a is null or coalesce(
    jsonb_typeof(a) = 'object'
    and (a - array['displayName','level','stage','mood','power','streak','updatedAt','look','hair','body']) = '{}'::jsonb
    and (not a ? 'level'  or jsonb_typeof(a->'level')  = 'number')
    and (not a ? 'stage'  or jsonb_typeof(a->'stage')  = 'number')
    and (not a ? 'power'  or jsonb_typeof(a->'power')  = 'number')
    and (not a ? 'streak' or jsonb_typeof(a->'streak') = 'number')
    and (not a ? 'mood'
         or jsonb_typeof(a->'mood') = 'null'
         or (jsonb_typeof(a->'mood') = 'string' and a->>'mood' in ('charged','awake','tired','proud','lazy')))
    and (not a ? 'look' or (
         jsonb_typeof(a->'look') = 'object'
         and (select count(*) from jsonb_object_keys(a->'look')) <= 24
         and not exists (
           select 1 from jsonb_each(a->'look') e
           where e.key !~ '^[A-Za-z]{1,16}$'
              or jsonb_typeof(e.value) <> 'string'
              or (e.value #>> '{}') !~ '^[A-Za-z]{1,16}$'
         )
    ))
    -- case statt and: der Cast nach numeric darf nur bei Zahlen laufen (sonst Fehler statt false).
    -- "in (…)" prüft Bereich und Ganzzahligkeit zugleich (2.5 fällt durch, 2.0 = 2 ist erlaubt).
    and (not a ? 'hair'
         or case when jsonb_typeof(a->'hair') = 'number'
                 then (a->'hair')::numeric in (0,1,2,3,4,5,6)
                 else false end)
    and (not a ? 'body'
         or case when jsonb_typeof(a->'body') = 'number'
                 then (a->'body')::numeric in (0,1,2,3,4,5,6,7,8,9)
                 else false end),
    false
  )
$$;

notify pgrst, 'reload schema';
