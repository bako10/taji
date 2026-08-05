-- ============================================================
-- TAJI — Schéma initial
-- Gestion de stations-service (Mali)
-- Cœur : réconciliation pompes / cuves / caisse
-- Modules : crédits clients B2B, équipe & quarts, rapports
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- PROFILS ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'Profil applicatif 1-1 avec auth.users.';

-- ---------- ORGANISATIONS (1 propriétaire = 1+ org) ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  city text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- gérants rattachés à une station (comptes réels)
create table public.station_members (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'gerant' check (role in ('gerant')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (station_id, user_id)
);

-- codes d'invitation générés par le propriétaire pour ses gérants
create table public.invites (
  code text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete cascade,
  role text not null default 'gerant',
  created_at timestamptz not null default now(),
  used_by uuid references auth.users(id),
  used_at timestamptz
);

-- ---------- INFRASTRUCTURE STATION ----------
create table public.tanks (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  product text not null check (product in ('essence','gasoil','petrole','melange')),
  name text not null,
  capacity_l numeric not null check (capacity_l > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.nozzles (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- prix officiels par organisation (historisés)
create table public.prices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product text not null check (product in ('essence','gasoil','petrole','melange')),
  price_fcfa numeric not null check (price_fcfa > 0),
  effective_date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- ÉQUIPE & QUARTS ----------
-- employés de la station (pompistes...), avec ou sans compte
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'pompiste' check (role in ('pompiste','caissier','autre')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- RELEVÉS QUOTIDIENS ----------
create table public.nozzle_readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  nozzle_id uuid not null references public.nozzles(id) on delete cascade,
  day date not null,
  shift_label text not null default 'journee' check (shift_label in ('journee','matin','soir','nuit')),
  opening_index numeric not null check (opening_index >= 0),
  closing_index numeric check (closing_index is null or closing_index >= opening_index),
  staff_id uuid references public.staff(id) on delete set null,
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nozzle_id, day, shift_label)
);
comment on table public.nozzle_readings is 'Index pompes par pistolet, jour et quart. staff_id = pompiste responsable du quart (module équipe).';

create table public.tank_dips (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  day date not null,
  dip_l numeric not null check (dip_l >= 0),
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tank_id, day)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  day date not null,
  supplier text not null default '',
  volume_invoiced_l numeric not null check (volume_invoiced_l >= 0),
  volume_received_l numeric check (volume_received_l is null or volume_received_l >= 0),
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
comment on table public.deliveries is 'Livraisons : volume facturé (BL) vs volume réellement reçu en cuve = écart de livraison.';

-- ---------- CRÉDITS CLIENTS B2B ----------
create table public.credit_clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  plafond_fcfa numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ENCAISSEMENTS ----------
create table public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  day date not null,
  method text not null check (method in ('especes','orange_money','moov_money','credit','autre')),
  amount_fcfa numeric not null check (amount_fcfa >= 0),
  credit_client_id uuid references public.credit_clients(id) on delete set null,
  note text not null default '',
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
comment on table public.cash_entries is 'Recettes du jour par mode. method=credit => vente à crédit rattachée à credit_client_id.';

create table public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  credit_client_id uuid not null references public.credit_clients(id) on delete cascade,
  station_id uuid references public.stations(id) on delete set null,
  day date not null default current_date,
  amount_fcfa numeric not null check (amount_fcfa > 0),
  method text not null default 'especes' check (method in ('especes','orange_money','moov_money','autre')),
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
comment on table public.credit_payments is 'Remboursements des clients à crédit.';

-- ---------- CLÔTURES ----------
create table public.day_closures (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  day date not null,
  closed_by uuid references auth.users(id),
  closed_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'closed' check (status in ('closed','reopened')),
  unique (station_id, day)
);
comment on table public.day_closures is 'Clôture quotidienne : fige les relevés et stocke la synthèse calculée (litres, CA théorique, encaissé, écarts).';

-- ---------- JOURNAL D''AUDIT ----------
create table public.audit_log (
  id bigint generated always as identity primary key,
  station_id uuid,
  user_id uuid default auth.uid(),
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  at timestamptz not null default now()
);

-- ============================================================
-- SÉCURITÉ (RLS)
-- ============================================================

-- Fonctions d'accès (security definer pour éviter la récursion RLS)
create or replace function public.my_org_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select id from organizations where owner_id = auth.uid()
$$;

create or replace function public.my_station_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select s.id from stations s join organizations o on o.id = s.org_id where o.owner_id = auth.uid()
  union
  select sm.station_id from station_members sm where sm.user_id = auth.uid() and sm.active
$$;

create or replace function public.my_member_org_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select id from organizations where owner_id = auth.uid()
  union
  select s.org_id from station_members sm join stations s on s.id = sm.station_id
   where sm.user_id = auth.uid() and sm.active
$$;

create or replace function public.station_is_closed(sid uuid, d date)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from day_closures where station_id = sid and day = d and status = 'closed')
$$;

-- Activer RLS partout
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.stations enable row level security;
alter table public.station_members enable row level security;
alter table public.invites enable row level security;
alter table public.tanks enable row level security;
alter table public.nozzles enable row level security;
alter table public.prices enable row level security;
alter table public.staff enable row level security;
alter table public.nozzle_readings enable row level security;
alter table public.tank_dips enable row level security;
alter table public.deliveries enable row level security;
alter table public.credit_clients enable row level security;
alter table public.cash_entries enable row level security;
alter table public.credit_payments enable row level security;
alter table public.day_closures enable row level security;
alter table public.audit_log enable row level security;

-- profiles : chacun voit/édite le sien
create policy "own profile select" on public.profiles for select using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());

-- organizations : le propriétaire gère ; les membres voient
create policy "org select" on public.organizations for select
  using (id in (select public.my_member_org_ids()));
create policy "org insert" on public.organizations for insert with check (owner_id = auth.uid());
create policy "org update" on public.organizations for update using (owner_id = auth.uid());
create policy "org delete" on public.organizations for delete using (owner_id = auth.uid());

-- stations : membres = lecture ; propriétaire = tout
create policy "station select" on public.stations for select
  using (id in (select public.my_station_ids()));
create policy "station cud" on public.stations for all
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

-- station_members : propriétaire gère ; le membre se voit
create policy "members select" on public.station_members for select
  using (user_id = auth.uid()
         or station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));
create policy "members cud" on public.station_members for all
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())))
  with check (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));
-- + un gérant peut s'auto-rattacher via un code d'invitation valide (fonction dédiée plus bas)

-- invites : seul le propriétaire les gère/voit
create policy "invites owner" on public.invites for all
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

-- infra (tanks, nozzles) : lecture membres, écriture propriétaire
create policy "tanks select" on public.tanks for select using (station_id in (select public.my_station_ids()));
create policy "tanks cud" on public.tanks for all
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())))
  with check (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));
create policy "nozzles select" on public.nozzles for select using (station_id in (select public.my_station_ids()));
create policy "nozzles cud" on public.nozzles for all
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())))
  with check (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

-- prices : lecture membres org, écriture propriétaire
create policy "prices select" on public.prices for select using (org_id in (select public.my_member_org_ids()));
create policy "prices cud" on public.prices for all
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

-- staff : lecture + écriture par membres et propriétaire (le gérant gère ses pompistes)
create policy "staff select" on public.staff for select using (station_id in (select public.my_station_ids()));
create policy "staff cud" on public.staff for all
  using (station_id in (select public.my_station_ids()))
  with check (station_id in (select public.my_station_ids()));

-- relevés : membres de la station ; modification bloquée après clôture
create policy "readings select" on public.nozzle_readings for select using (station_id in (select public.my_station_ids()));
create policy "readings insert" on public.nozzle_readings for insert
  with check (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "readings update" on public.nozzle_readings for update
  using (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "readings delete owner" on public.nozzle_readings for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

create policy "dips select" on public.tank_dips for select using (station_id in (select public.my_station_ids()));
create policy "dips insert" on public.tank_dips for insert
  with check (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "dips update" on public.tank_dips for update
  using (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "dips delete owner" on public.tank_dips for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

create policy "deliv select" on public.deliveries for select using (station_id in (select public.my_station_ids()));
create policy "deliv insert" on public.deliveries for insert
  with check (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "deliv update" on public.deliveries for update
  using (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "deliv delete owner" on public.deliveries for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

-- crédits : visibles par tous les membres de l'org ; création/édition idem ; suppression propriétaire
create policy "cclients select" on public.credit_clients for select using (org_id in (select public.my_member_org_ids()));
create policy "cclients cu" on public.credit_clients for insert with check (org_id in (select public.my_member_org_ids()));
create policy "cclients upd" on public.credit_clients for update using (org_id in (select public.my_member_org_ids()));
create policy "cclients del" on public.credit_clients for delete using (org_id in (select public.my_org_ids()));

create policy "cash select" on public.cash_entries for select using (station_id in (select public.my_station_ids()));
create policy "cash insert" on public.cash_entries for insert
  with check (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "cash update" on public.cash_entries for update
  using (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "cash delete owner" on public.cash_entries for delete
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

create policy "cpay select" on public.credit_payments for select
  using (credit_client_id in (select id from public.credit_clients where org_id in (select public.my_member_org_ids())));
create policy "cpay insert" on public.credit_payments for insert
  with check (credit_client_id in (select id from public.credit_clients where org_id in (select public.my_member_org_ids())));
create policy "cpay delete owner" on public.credit_payments for delete
  using (credit_client_id in (select id from public.credit_clients where org_id in (select public.my_org_ids())));

-- clôtures : membres créent ; seul le propriétaire peut rouvrir
create policy "closures select" on public.day_closures for select using (station_id in (select public.my_station_ids()));
create policy "closures insert" on public.day_closures for insert with check (station_id in (select public.my_station_ids()));
create policy "closures update owner" on public.day_closures for update
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));

-- audit : lecture propriétaire ; insertion par tout membre authentifié sur ses stations
create policy "audit select owner" on public.audit_log for select
  using (station_id in (select s.id from public.stations s where s.org_id in (select public.my_org_ids())));
create policy "audit insert" on public.audit_log for insert
  with check (station_id is null or station_id in (select public.my_station_ids()));

-- ============================================================
-- FONCTIONS MÉTIER
-- ============================================================

-- Rejoindre une station avec un code d'invitation
create or replace function public.join_with_invite(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare v_inv invites%rowtype; v_station stations%rowtype;
begin
  select * into v_inv from invites where code = upper(trim(p_code)) and used_by is null;
  if not found then
    return json_build_object('ok', false, 'error', 'Code invalide ou déjà utilisé');
  end if;
  insert into station_members (station_id, user_id, role)
  values (v_inv.station_id, auth.uid(), v_inv.role)
  on conflict (station_id, user_id) do update set active = true;
  update invites set used_by = auth.uid(), used_at = now() where code = v_inv.code;
  select * into v_station from stations where id = v_inv.station_id;
  return json_build_object('ok', true, 'station_id', v_station.id, 'station_name', v_station.name);
end $$;

-- updated_at automatique
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_touch_readings before update on public.nozzle_readings for each row execute function public.touch_updated_at();
create trigger trg_touch_dips before update on public.tank_dips for each row execute function public.touch_updated_at();

-- profil auto à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Index utiles
create index idx_readings_station_day on public.nozzle_readings (station_id, day);
create index idx_dips_station_day on public.tank_dips (station_id, day);
create index idx_cash_station_day on public.cash_entries (station_id, day);
create index idx_deliv_station_day on public.deliveries (station_id, day);
create index idx_closures_station_day on public.day_closures (station_id, day);
create index idx_cpay_client on public.credit_payments (credit_client_id);
