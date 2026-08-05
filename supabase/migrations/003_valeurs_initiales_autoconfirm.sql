-- Index initial des pistolets et stock initial des cuves
alter table public.nozzles add column initial_index numeric not null default 0 check (initial_index >= 0);
alter table public.tanks add column initial_stock_l numeric not null default 0 check (initial_stock_l >= 0);
-- Auto-confirmation email (à retirer quand un fournisseur SMTP sera configuré)
create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer set search_path = auth as $$
begin
  new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
  return new;
end $$;
revoke execute on function public.auto_confirm_email() from anon, authenticated;
create trigger trg_auto_confirm before insert on auth.users
  for each row execute function public.auto_confirm_email();
