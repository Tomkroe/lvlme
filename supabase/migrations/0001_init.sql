-- LvlMe: Profile, Einladungen, Freundschaften
-- Grundsatz: Auf dem Server liegt nur der öffentliche Avatarzustand (PublicAvatar), nie Gesundheitsrohdaten.
-- Im Supabase-Dashboard unter "SQL Editor" komplett ausführen.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Prüft, dass ein Avatar-JSON nur die erlaubten PublicAvatar-Felder enthält.
-- So kann auch eine fehlerhafte App-Version keine Schritte, Puls o. Ä. ablegen.
-- ---------------------------------------------------------------------------
create or replace function public.is_public_avatar(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select a is null or (
    jsonb_typeof(a) = 'object'
    and (a - array['displayName','level','stage','mood','power','streak','updatedAt']) = '{}'::jsonb
    and (not a ? 'level'  or jsonb_typeof(a->'level')  = 'number')
    and (not a ? 'stage'  or jsonb_typeof(a->'stage')  = 'number')
    and (not a ? 'power'  or jsonb_typeof(a->'power')  = 'number')
    and (not a ? 'streak' or jsonb_typeof(a->'streak') = 'number')
    and (not a ? 'mood'   or a->>'mood' in ('charged','awake','tired','proud','lazy'))
  )
$$;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Kämpfer' check (char_length(display_name) between 1 and 30),
  avatar       jsonb check (public.is_public_avatar(avatar)),
  updated_at   timestamptz not null default now()
);

create table if not exists public.invites (
  code       text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  owner      uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index if not exists invites_owner_idx on public.invites (owner);

-- Freundschaft genau einmal pro Paar: user_a ist immer die kleinere UUID.
create table if not exists public.friendships (
  user_a     uuid not null references auth.users (id) on delete cascade,
  user_b     uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friendships_user_b_idx on public.friendships (user_b);

-- ---------------------------------------------------------------------------
-- Hilfsfunktion für RLS (security definer, damit keine RLS-Rekursion entsteht)
-- ---------------------------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b)
  )
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.invites     enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profiles: eigenes oder Freunde lesen" on public.profiles;
create policy "profiles: eigenes oder Freunde lesen" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.are_friends(auth.uid(), id));

drop policy if exists "profiles: eigenes anlegen" on public.profiles;
create policy "profiles: eigenes anlegen" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles: eigenes ändern" on public.profiles;
create policy "profiles: eigenes ändern" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "invites: eigene lesen" on public.invites;
create policy "invites: eigene lesen" on public.invites
  for select to authenticated
  using (owner = auth.uid());
-- Einladungen werden nur über create_invite()/accept_invite() angelegt bzw. gelesen.

drop policy if exists "friendships: eigene lesen" on public.friendships;
create policy "friendships: eigene lesen" on public.friendships
  for select to authenticated
  using (auth.uid() in (user_a, user_b));
-- Anlegen/Löschen nur über accept_invite()/remove_friend().

-- Direkter Tabellenzugriff nur für angemeldete Nutzer, und nur so weit nötig.
revoke all on public.profiles, public.invites, public.friendships from anon;
revoke insert, update, delete on public.invites, public.friendships from authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.invites, public.friendships to authenticated;

-- ---------------------------------------------------------------------------
-- Profil beim ersten Anmelden anlegen
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    'Kämpfer'
  );
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 30))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC: Einladungscode erzeugen (6 Zeichen ohne 0/O/1/I/L, 7 Tage gültig, mehrfach nutzbar)
-- ---------------------------------------------------------------------------
create or replace function public.create_invite()
returns table (code text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code     text;
  v_bytes    bytea;
  i          int;
  attempt    int := 0;
begin
  if v_uid is null then
    raise exception 'Bitte melde dich zuerst an.' using errcode = '28000';
  end if;

  -- Abgelaufene Codes aufräumen
  delete from public.invites i_ where i_.owner = v_uid and i_.expires_at < now();

  -- Höchstens 20 gültige Codes pro Person
  if (select count(*) from public.invites i_ where i_.owner = v_uid) >= 20 then
    raise exception 'Du hast schon viele offene Einladungen. Versuch es später noch einmal.' using errcode = 'P0001';
  end if;

  loop
    attempt := attempt + 1;
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
    end loop;
    begin
      insert into public.invites (code, owner) values (v_code, v_uid);
      exit;
    exception when unique_violation then
      if attempt >= 10 then
        raise exception 'Einladung konnte nicht erstellt werden. Bitte noch einmal versuchen.' using errcode = 'P0001';
      end if;
    end;
  end loop;

  return query
    select i_.code, i_.expires_at from public.invites i_ where i_.code = v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: Einladung annehmen → Freundschaft anlegen, Namen des Einladenden zurückgeben
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

  select i_.owner into v_owner
  from public.invites i_
  where i_.code = v_code and i_.expires_at > now();

  if v_owner is null then
    raise exception 'Dieser Code ist ungültig oder abgelaufen.' using errcode = 'P0002';
  end if;

  if v_owner = v_uid then
    raise exception 'Das ist dein eigener Code.' using errcode = 'P0001';
  end if;

  insert into public.friendships (user_a, user_b)
  values (least(v_uid, v_owner), greatest(v_uid, v_owner))
  on conflict do nothing;

  select p.display_name into v_name from public.profiles p where p.id = v_owner;
  return coalesce(v_name, 'Kämpfer');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: Freundschaft beenden
-- ---------------------------------------------------------------------------
create or replace function public.remove_friend(p_friend uuid)
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
  delete from public.friendships f
  where f.user_a = least(v_uid, p_friend) and f.user_b = greatest(v_uid, p_friend);
end;
$$;

-- Funktionen nur für angemeldete Nutzer
revoke execute on function public.create_invite()         from public, anon;
revoke execute on function public.accept_invite(text)     from public, anon;
revoke execute on function public.remove_friend(uuid)     from public, anon;
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
grant execute on function public.create_invite()          to authenticated;
grant execute on function public.accept_invite(text)      to authenticated;
grant execute on function public.remove_friend(uuid)      to authenticated;
grant execute on function public.are_friends(uuid, uuid)  to authenticated;
