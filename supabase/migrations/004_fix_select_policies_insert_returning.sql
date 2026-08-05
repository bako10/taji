-- Correction : les politiques SELECT doivent reconnaître une ligne fraîchement
-- insérée dans la même requête (INSERT ... RETURNING). On ajoute un prédicat
-- direct sur la ligne, qui ne dépend pas d'un instantané de la même table.
drop policy "org select" on public.organizations;
create policy "org select" on public.organizations for select
  using (owner_id = auth.uid() or id in (select public.my_member_org_ids()));

drop policy "station select" on public.stations;
create policy "station select" on public.stations for select
  using (org_id in (select public.my_org_ids()) or id in (select public.my_station_ids()));
