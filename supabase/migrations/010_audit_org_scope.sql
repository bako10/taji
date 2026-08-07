-- Journal d'activité : rattacher les événements d'audit à l'organisation, pour que le
-- propriétaire voie AUSSI les événements org-level (ex. changements de prix, station_id null)
-- que la policy basée sur la station ne montrait pas. Lecture réservée au propriétaire.

alter table public.audit_log add column org_id uuid references public.organizations(id);

-- Remplir l'org des lignes existantes via la station
update public.audit_log a
set org_id = s.org_id
from public.stations s
where a.station_id = s.id and a.org_id is null;

-- SELECT : propriétaire uniquement (portée organisation ; repli station pour anciennes lignes)
drop policy "audit select owner" on public.audit_log;
create policy "audit select owner" on public.audit_log for select
  using (
    org_id in (select public.my_org_ids())
    or station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids()))
  );

-- INSERT : membre de la station, et si org_id fourni il doit appartenir à l'org du membre
drop policy "audit insert" on public.audit_log;
create policy "audit insert" on public.audit_log for insert
  with check (
    (station_id is null or station_id in (select public.my_station_ids()))
    and (org_id is null or org_id in (select public.my_member_org_ids()))
  );

create index idx_audit_org on public.audit_log (org_id, at desc);
