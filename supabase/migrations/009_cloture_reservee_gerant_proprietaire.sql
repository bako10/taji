-- Sécurité : la clôture d'une journée est réservée au propriétaire et aux gérants.
-- La policy précédente autorisait TOUT membre de la station (dont les pompistes) à
-- insérer une clôture ; le blocage n'existait qu'en interface. On l'applique en base.
drop policy "closures insert" on public.day_closures;
create policy "closures insert" on public.day_closures for insert with check (
  -- propriétaire de l'organisation de la station
  station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids()))
  -- ou gérant (actif) de la station — jamais un pompiste
  or station_id in (
    select sm.station_id from public.station_members sm
    where sm.user_id = auth.uid() and sm.active and sm.role = 'gerant'
  )
);
