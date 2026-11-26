-- Upozornenia: predvolene zapnuté, záznam o odoslaní, pripomienky deň vopred
alter table public.volunteers add column if not exists push_enabled boolean not null default true;

create table if not exists public.push_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  title text,
  recipients int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  errors text
);
alter table public.push_log enable row level security;
create policy push_log_admin on public.push_log for select to authenticated using (public.is_admin());
grant select on public.push_log to authenticated;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Pripomienky deň vopred: každý deň o 16:00 UTC (17:00 v zime, 18:00 v lete).
-- Nastavené cez cron.schedule('pripomienky-den-vopred', '0 16 * * *', ...) s hlavičkou x-cron-secret;
-- tajný kľúč je uložený len v databáze a v nastaveniach funkcie, nie v tomto repozitári.
