-- LvlMe 0008: Aussehen des Avatars (Haut, Haare, Augen, Bart, Brille, Stirnband)
-- Im Supabase SQL Editor ausführen. Darf mehrfach laufen.
--
-- Das Aussehen liegt im öffentlichen Avatar-Zustand (profiles.avatar.look), damit Freunde
-- deinen Kämpfer so sehen, wie du ihn gestaltet hast. Es sind nur feste Auswahl-Schlüssel
-- erlaubt (kurze Wörter), keine Fotos und kein Freitext.

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
         and ((a->'look') - array['skin','hair','hairStyle','eyes','band','beard','glasses']) = '{}'::jsonb
         and not exists (
           select 1 from jsonb_each(a->'look') e
           where jsonb_typeof(e.value) <> 'string' or length(e.value #>> '{}') > 16
         )
    )),
    false
  )
$$;

notify pgrst, 'reload schema';
