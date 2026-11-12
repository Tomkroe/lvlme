-- LvlMe: Nachbesserungen aus der Datenschutz-Prüfung
-- Im Supabase-Dashboard unter "SQL Editor" komplett ausführen, nachdem 0001 und 0002 gelaufen sind.
-- Darf mehrfach laufen.
--
-- 1. Avatar: "mood" darf null sein (Nutzer teilt seine Tagesform nicht).
-- 2. are_friends() ist nicht mehr per API aufrufbar (sonst könnte jeder prüfen,
--    ob zwei beliebige Nutzer befreundet sind). Die Profil-Policy prüft die
--    Freundschaft jetzt direkt.
-- 3. Einladungscodes gelten nur einmal: accept_invite() löscht den Code beim Annehmen.
-- 4. Neues Profil heißt immer "Kämpfer"; der Name von Apple wird nicht übernommen.
--    Den öffentlichen Namen setzt die App aus dem Onboarding (setDisplayName).

-- ---------------------------------------------------------------------------
-- 1. Avatar-Prüfung: mood ist eine erlaubte Stimmung oder null
-- coalesce(…, false): Die Prüfung liefert nie NULL (ein CHECK mit NULL gilt sonst als bestanden).
-- Bereits gespeicherte Zeilen werden nicht neu geprüft; neue Schreibvorgänge schon.
-- ---------------------------------------------------------------------------
create or replace function public.is_public_avatar(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select a is null or coalesce(
    jsonb_typeof(a) = 'object'
    and (a - array['displayName','level','stage','mood','power','streak','updatedAt']) = '{}'::jsonb
    and (not a ? 'level'  or jsonb_typeof(a->'level')  = 'number')
    and (not a ? 'stage'  or jsonb_typeof(a->'stage')  = 'number')
    and (not a ? 'power'  or jsonb_typeof(a->'power')  = 'number')
    and (not a ? 'streak' or jsonb_typeof(a->'streak') = 'number')
    and (not a ? 'mood'
         or jsonb_typeof(a->'mood') = 'null'
         or (jsonb_typeof(a->'mood') = 'string' and a->>'mood' in ('charged','awake','tired','proud','lazy'))),
    false
  )
$$;

-- ---------------------------------------------------------------------------
-- 2. Profil-Policy ohne are_friends()
-- RLS-Ausdrücke laufen mit den Rechten des anfragenden Nutzers, nicht als
-- Tabellenbesitzer. Würde die Policy are_friends() aufrufen, bräuchte
-- "authenticated" EXECUTE darauf – und könnte die Funktion dann auch per
-- /rpc/are_friends mit beliebigen IDs aufrufen. Deshalb prüft die Policy die
-- Freundschaft direkt. Die Unterabfrage auf friendships unterliegt deren RLS
-- ("eigene lesen"), sieht also genau die eigenen Freundschaften. Keine
-- Rekursion, weil die friendships-Policy profiles nicht anfasst.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: eigenes oder Freunde lesen" on public.profiles;
create policy "profiles: eigenes oder Freunde lesen" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where f.user_a = least((select auth.uid()), profiles.id)
        and f.user_b = greatest((select auth.uid()), profiles.id)
    )
  );

-- are_friends() bleibt bestehen (falls etwas Internes sie nutzt), ist aber
-- für niemanden außer dem Besitzer mehr aufrufbar.
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Einladung annehmen: Code wird dabei verbraucht (gelöscht)
-- Das Löschen mit "returning" ist atomar: Lösen zwei Personen denselben Code
-- gleichzeitig ein, gewinnt genau eine.
-- ---------------------------------------------------------------------------
create or replace function public.accept_invite(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_code  text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_owner uuid;
  v_name  text;
begin
  if v_uid is null then
    raise exception 'Bitte melde dich zuerst an.' using errcode = '28000';
  end if;

  delete from public.invites i_
  where i_.code = v_code
    and i_.expires_at > now()
    and i_.owner <> v_uid
  returning i_.owner into v_owner;

  if v_owner is null then
    if exists (select 1 from public.invites i_ where i_.code = v_code and i_.owner = v_uid) then
      raise exception 'Das ist dein eigener Code.' using errcode = 'P0001';
    end if;
    raise exception 'Dieser Code ist ungültig, abgelaufen oder wurde schon benutzt.' using errcode = 'P0002';
  end if;

  insert into public.friendships (user_a, user_b)
  values (least(v_uid, v_owner), greatest(v_uid, v_owner))
  on conflict do nothing;

  select p.display_name into v_name from public.profiles p where p.id = v_owner;
  return coalesce(v_name, 'Kämpfer');
end;
$$;

revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

comment on table public.invites is
  'Einladungscodes: 6 Zeichen, 7 Tage gültig, einmal nutzbar (accept_invite löscht den Code).';

-- ---------------------------------------------------------------------------
-- 4. Neues Profil immer als "Kämpfer" anlegen, ohne Namen von Apple
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'Kämpfer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
