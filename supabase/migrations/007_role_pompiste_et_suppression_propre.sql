-- Rôle « pompiste » (saisie seule) + suppression de ses PROPRES saisies avant clôture.

-- 1) Autoriser le rôle pompiste
alter table public.station_members drop constraint station_members_role_check;
alter table public.station_members add constraint station_members_role_check
  check (role in ('gerant','pompiste'));
alter table public.invites add constraint invites_role_check
  check (role in ('gerant','pompiste'));

-- 2) Suppression : chaque membre peut supprimer SES propres saisies tant que la
-- journée n'est pas clôturée ; le propriétaire garde la suppression complète.
-- (Les politiques RLS sont permissives → combinées en OU.)

drop policy "readings delete owner" on public.nozzle_readings;
create policy "readings delete own" on public.nozzle_readings for delete
  using (entered_by = auth.uid() and station_id in (select public.my_station_ids())
         and not public.station_is_closed(station_id, day));
create policy "readings delete owner" on public.nozzle_readings for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

drop policy "dips delete owner" on public.tank_dips;
create policy "dips delete own" on public.tank_dips for delete
  using (entered_by = auth.uid() and station_id in (select public.my_station_ids())
         and not public.station_is_closed(station_id, day));
create policy "dips delete owner" on public.tank_dips for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

drop policy "deliv delete owner" on public.deliveries;
create policy "deliv delete own" on public.deliveries for delete
  using (entered_by = auth.uid() and station_id in (select public.my_station_ids())
         and not public.station_is_closed(station_id, day));
create policy "deliv delete owner" on public.deliveries for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

drop policy "cash delete owner" on public.cash_entries;
create policy "cash delete own" on public.cash_entries for delete
  using (entered_by = auth.uid() and station_id in (select public.my_station_ids())
         and not public.station_is_closed(station_id, day));
create policy "cash delete owner" on public.cash_entries for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));
