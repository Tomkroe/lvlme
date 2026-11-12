-- LvlMe: delete_account() auf die Health-Tabellen aus 0004 erweitern
-- Im Supabase-Dashboard unter "SQL Editor" ausführen, nachdem 0001–0004 gelaufen sind. Darf mehrfach laufen.
--
-- health_metrics und device_tokens haben zwar "on delete cascade" auf auth.users (0004),
-- würden also beim Löschen des Kontos ohnehin verschwinden. delete_account() löscht alle
-- anderen Tabellen trotzdem ausdrücklich ("damit nichts übrig bleibt, falls sich das Schema
-- später ändert", siehe 0002). Bei Gesundheitsdaten (DSGVO Art. 9) ist das Verlassen auf
-- FK-Cascade ein unnötiges Risiko – deshalb hier nachgezogen.

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

  delete from public.health_metrics h where h.user_id = v_uid;
  delete from public.device_tokens  t where t.user_id = v_uid;
  delete from public.friendships f where v_uid in (f.user_a, f.user_b);
  delete from public.invites i_    where i_.owner = v_uid;
  delete from public.profiles p    where p.id = v_uid;
  delete from auth.users u         where u.id = v_uid;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
