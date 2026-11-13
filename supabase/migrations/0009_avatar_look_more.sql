-- LvlMe 0009: Mehr Aussehen-Optionen (Gesicht, Ohren, Nase, Mund, Größe, Statur …)
-- Ersetzt die Prüfung aus 0008: Statt einer festen Liste sind jetzt beliebige kurze
-- Auswahl-Schlüssel erlaubt (nur Buchstaben, max. 24 Einträge, Werte max. 16 Zeichen).
-- So braucht nicht jede neue Option eine eigene Migration. Darf mehrfach laufen.
--
-- Größe und Statur sind bewusst grobe Stufen (klein/mittel/groß, schlank/athletisch/…),
-- keine echten cm- oder kg-Werte – die bleiben privat bzw. werden gar nicht erfasst.

create or replace function public.is_public_avatar(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select a is null or coalesce(
    jsonb_typeof(a) = 'object'
    and (a - array['displayName','level','stage','mood','power','streak','updatedAt','look']) = '{}'::jsonb
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
    )),
    false
  )
$$;

notify pgrst, 'reload schema';
