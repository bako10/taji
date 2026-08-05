-- Preuves photos des saisies : bucket privé + RLS par station + colonnes de lien.

-- 1) Bucket privé de stockage
insert into storage.buckets (id, name, public)
values ('preuves', 'preuves', false)
on conflict (id) do nothing;

-- 2) RLS sur les objets : le 1er dossier du chemin = station_id (ex: <station_id>/<jour>/<type>/<fichier>.jpg)
-- Lecture / écriture réservées aux membres de la station ; suppression au propriétaire.
create policy "preuves read" on storage.objects for select to authenticated
  using (bucket_id = 'preuves'
         and ((storage.foldername(name))[1])::uuid in (select public.my_station_ids()));

create policy "preuves insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'preuves'
         and ((storage.foldername(name))[1])::uuid in (select public.my_station_ids()));

create policy "preuves update" on storage.objects for update to authenticated
  using (bucket_id = 'preuves'
         and ((storage.foldername(name))[1])::uuid in (select public.my_station_ids()));

create policy "preuves delete" on storage.objects for delete to authenticated
  using (bucket_id = 'preuves'
         and ((storage.foldername(name))[1])::uuid in (
           select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

-- 3) Lien photo sur les saisies chiffrées + réglage par station
alter table public.nozzle_readings add column photo_path text;
alter table public.tank_dips     add column photo_path text;
alter table public.deliveries    add column photo_path text;
alter table public.stations      add column require_photo boolean not null default false;
comment on column public.stations.require_photo is 'Si vrai, une photo de preuve est exigée pour valider les saisies chiffrées de la station.';
