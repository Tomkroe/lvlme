-- 0010: Eigenes Avatar-Bild hochladen
-- Speicher "avatars" (privat). Jede Person legt Bilder nur im eigenen Ordner <user-id>/ ab.
-- Sehen dürfen das Bild nur die Person selbst und ihre Freunde (gleiche Regel wie beim Profil).
-- Es werden nur fertige Avatar-Bilder (PNG/WebP, max. 1 MB) gespeichert – keine Fotos aus der Kamera
-- im Original und keine Gesundheitsdaten.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Darf die angemeldete Person die Datei <owner-id>/<name> sehen?
create or replace function public.can_see_avatar_file(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then return false; end if;
  begin
    v_owner := split_part(p_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return v_owner = auth.uid() or public.are_friends(auth.uid(), v_owner);
end
$$;

revoke all on function public.can_see_avatar_file(text) from public;
grant execute on function public.can_see_avatar_file(text) to authenticated;

drop policy if exists "avatars: lesen eigene und Freunde" on storage.objects;
create policy "avatars: lesen eigene und Freunde" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.can_see_avatar_file(name));

drop policy if exists "avatars: eigene hochladen" on storage.objects;
create policy "avatars: eigene hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "avatars: eigene ersetzen" on storage.objects;
create policy "avatars: eigene ersetzen" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "avatars: eigene löschen" on storage.objects;
create policy "avatars: eigene löschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
