-- Durcissement sécurité suite aux advisors Supabase
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
revoke execute on function public.my_org_ids() from anon;
revoke execute on function public.my_station_ids() from anon;
revoke execute on function public.my_member_org_ids() from anon;
revoke execute on function public.station_is_closed(uuid, date) from anon;
revoke execute on function public.join_with_invite(text) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon;
