-- Marge & rentabilité quotidienne (comble le principal manque concurrentiel).
-- 1) Prix d'achat historisé (à côté du prix de vente déjà présent dans `prices`).
alter table public.prices
  add column buy_price_fcfa numeric check (buy_price_fcfa is null or buy_price_fcfa >= 0);
comment on column public.prices.buy_price_fcfa is 'Prix d''achat FCFA/L à cette date (pour la marge). NULL = non renseigné.';

-- 2) Dépenses quotidiennes de la station (salaires, maintenance, électricité, taxes…).
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  day date not null,
  category text not null default 'autre'
    check (category in ('salaire','maintenance','electricite','transport','taxe','carburant','autre')),
  label text not null default '',
  amount_fcfa numeric not null check (amount_fcfa >= 0),
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
comment on table public.expenses is 'Dépenses du jour par station, retranchées de la marge brute pour obtenir la marge nette.';

alter table public.expenses enable row level security;

-- RLS calquée sur cash_entries : membres de la station, écriture bloquée après clôture.
create policy "exp select" on public.expenses for select
  using (station_id in (select public.my_station_ids()));
create policy "exp insert" on public.expenses for insert
  with check (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "exp update" on public.expenses for update
  using (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));
create policy "exp delete" on public.expenses for delete
  using (station_id in (select public.my_station_ids()) and not public.station_is_closed(station_id, day));

create index idx_expenses_station_day on public.expenses (station_id, day);
