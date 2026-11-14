-- LvlMe: Aussehen des Avatars (Frisur und Körper) für Freunde sichtbar machen
-- Im Supabase-Dashboard unter "SQL Editor" komplett ausführen, nachdem 0001 bis 0003 gelaufen sind.
-- Darf mehrfach laufen.
--
-- is_public_avatar() lässt zusätzlich zwei optionale Felder zu:
--   hair: Frisur, ganze Zahl 0–6 (Index in HAIRSTYLES, src/avatar/assets.ts)
--   body: Körpertyp/Outfit, ganze Zahl 0–9 (Index in BODIES, src/avatar/assets.ts)
-- Beides sind reine Aussehensdaten, keine Gesundheitsdaten. Alle Prüfungen aus 0003 bleiben unverändert.
--
-- Die Check-Constraint auf profiles.avatar ruft die Funktion auf und muss nicht neu angelegt werden:
-- "create or replace" behält die Funktion (gleiche Signatur), neue Schreibvorgänge nutzen sofort die
-- neue Fassung. Bereits gespeicherte Zeilen bleiben gültig, weil die neue Prüfung nur mehr erlaubt.

create or replace function public.is_public_avatar(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select a is null or coalesce(
    jsonb_typeof(a) = 'object'
    and (a - array['displayName','level','stage','mood','power','streak','updatedAt','hair','body']) = '{}'::jsonb
    and (not a ? 'level'  or jsonb_typeof(a->'level')  = 'number')
    and (not a ? 'stage'  or jsonb_typeof(a->'stage')  = 'number')
    and (not a ? 'power'  or jsonb_typeof(a->'power')  = 'number')
    and (not a ? 'streak' or jsonb_typeof(a->'streak') = 'number')
    and (not a ? 'mood'
         or jsonb_typeof(a->'mood') = 'null'
         or (jsonb_typeof(a->'mood') = 'string' and a->>'mood' in ('charged','awake','tired','proud','lazy')))
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
