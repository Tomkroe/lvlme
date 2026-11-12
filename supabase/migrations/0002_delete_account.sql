-- LvlMe: Konto in der App löschen (App Store Guideline 5.1.1(v))
-- Im Supabase-Dashboard unter "SQL Editor" komplett ausführen, nachdem 0001_init.sql gelaufen ist.
-- Darf mehrfach laufen.

-- ---------------------------------------------------------------------------
-- RPC: Eigenes Konto endgültig löschen
-- Löscht Freundschaften, Einladungen, Profil und den Eintrag in auth.users des Aufrufers.
-- Die Fremdschlüssel haben zwar "on delete cascade", wir löschen trotzdem ausdrücklich,
-- damit nichts übrig bleibt, falls sich das Schema später ändert.
-- security definer: Nur so darf die Funktion in auth.users löschen. Sie betrifft immer
-- ausschließlich auth.uid(), nimmt also keine Parameter entgegen.
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

  delete from public.friendships f where v_uid in (f.user_a, f.user_b);
  delete from public.invites i_    where i_.owner = v_uid;
  delete from public.profiles p    where p.id = v_uid;
  delete from auth.users u         where u.id = v_uid;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
