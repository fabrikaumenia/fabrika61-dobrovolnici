-- Fabrika 61 – dobrovoľníci: databáza, oprávnenia a funkcie
-- Spúšťa sa raz na prázdnom Supabase projekte.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Pomocné funkcie
-- ---------------------------------------------------------------
create or replace function public.jarr(j jsonb) returns text[]
language sql immutable as $$
  select coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end)), '{}')
$$;

create or replace function public.local_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Bratislava')::date $$;

-- ---------------------------------------------------------------
-- Dobrovoľníci (údaje zo vstupného formulára)
-- ---------------------------------------------------------------
create table public.volunteers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  code text unique not null default ('F61-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  first_name text not null,
  last_name text not null default '',
  nick text,
  birthday text,
  city text,
  email text unique not null,
  phone text,
  age_group text,
  avail_days text[] not null default '{}',
  avail_days_other text,
  day_parts text[] not null default '{}',
  day_parts_other text,
  contact_freq text[] not null default '{}',
  contact_freq_other text,
  channels text[] not null default '{}',
  channels_other text,
  social_link text,
  help_forms text[] not null default '{}',
  help_other text,
  hobbies text[] not null default '{}',
  hobbies_other text,
  benefit_ideas text,
  sources text[] not null default '{}',
  sources_other text,
  photo_consent boolean not null default false,
  gdpr_consent_at timestamptz,
  photo_url text,
  status text not null default 'Nový' check (status in ('Nový','Aktívny','Neaktívny','Bývalý')),
  role text not null default 'volunteer' check (role in ('volunteer','admin')),
  prior_count int not null default 0 check (prior_count >= 0),
  origin text not null default 'Aplikácia',
  created_at timestamptz not null default now()
);

-- Údaje, ktoré vidia len admini
create table public.volunteer_admin (
  volunteer_id uuid primary key references public.volunteers(id) on delete cascade,
  tags text[] not null default '{}',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.my_volunteer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.volunteers where user_id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.volunteers where user_id = auth.uid() and role = 'admin')
$$;

-- Dobrovoľník si nemôže sám zmeniť rolu, stav, počty ani e-mail
create or replace function public.protect_volunteer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.role := old.role;
  new.status := old.status;
  new.prior_count := old.prior_count;
  new.user_id := old.user_id;
  new.code := old.code;
  new.origin := old.origin;
  new.email := old.email;
  new.created_at := old.created_at;
  return new;
end $$;

create trigger volunteers_protect before update on public.volunteers
for each row execute function public.protect_volunteer();

-- Po registrácii: prepojí existujúci záznam podľa e-mailu, alebo vytvorí nový z údajov formulára
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  vid uuid;
begin
  select id into vid from public.volunteers where lower(email) = lower(new.email) and user_id is null limit 1;
  if vid is not null then
    update public.volunteers set user_id = new.id where id = vid;
    return new;
  end if;
  if exists (select 1 from public.volunteers where user_id = new.id) then
    return new;
  end if;
  insert into public.volunteers (
    user_id, email, first_name, last_name, nick, birthday, city, phone, age_group,
    avail_days, avail_days_other, day_parts, day_parts_other, contact_freq, contact_freq_other,
    channels, channels_other, social_link, help_forms, help_other, hobbies, hobbies_other,
    benefit_ideas, sources, sources_other, photo_consent, gdpr_consent_at, origin
  ) values (
    new.id, lower(new.email),
    coalesce(nullif(m->>'first_name', ''), split_part(new.email, '@', 1)),
    coalesce(m->>'last_name', ''), m->>'nick', m->>'birthday', m->>'city', m->>'phone', m->>'age_group',
    public.jarr(m->'avail_days'), m->>'avail_days_other', public.jarr(m->'day_parts'), m->>'day_parts_other',
    public.jarr(m->'contact_freq'), m->>'contact_freq_other', public.jarr(m->'channels'), m->>'channels_other',
    m->>'social_link', public.jarr(m->'help_forms'), m->>'help_other', public.jarr(m->'hobbies'), m->>'hobbies_other',
    m->>'benefit_ideas', public.jarr(m->'sources'), m->>'sources_other',
    coalesce((m->>'photo_consent')::boolean, false),
    case when coalesce((m->>'gdpr')::boolean, false) then now() end,
    'Aplikácia'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Termíny (šichty a podujatia) a účasť
-- ---------------------------------------------------------------
create table public.terms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('shift','event')),
  title text not null,
  date date not null,
  time_label text not null default '',
  description text not null default '',
  capacity int not null default 10 check (capacity > 0),
  created_by uuid references public.volunteers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  term_id uuid references public.terms(id) on delete cascade,
  label text,
  date date,
  status text not null default 'rsvp' check (status in ('rsvp','confirmed','cancelled')),
  source text not null default 'app' check (source in ('app','qr','manual')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (volunteer_id, term_id),
  check (term_id is not null or (label is not null and date is not null))
);
create index participations_term on public.participations(term_id);

create or replace function public.year_count(p_vol uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.participations p left join public.terms t on t.id = p.term_id
  where p.volunteer_id = p_vol and p.status = 'confirmed'
    and extract(year from coalesce(t.date, p.date)) = extract(year from public.local_today())
$$;

-- Počet prihlásených na každý termín (dobrovoľník nevidí cudzie prihlásenia, len počty)
create or replace function public.term_counts() returns table (term_id uuid, signed int)
language sql stable security definer set search_path = public as $$
  select term_id, count(*)::int from public.participations
  where term_id is not null and status <> 'cancelled' group by term_id
$$;

-- Dobrovoľník mesiaca (pri rovnosti všetci s najvyšším počtom)
create or replace function public.month_leaders()
returns table (volunteer_id uuid, first_name text, last_name text, nick text, photo_url text, n int)
language sql stable security definer set search_path = public as $$
  with c as (
    select p.volunteer_id, count(*)::int as n
    from public.participations p left join public.terms t on t.id = p.term_id
    where p.status = 'confirmed'
      and date_trunc('month', coalesce(t.date, p.date)) = date_trunc('month', public.local_today())
    group by p.volunteer_id
  )
  select v.id, v.first_name, v.last_name, v.nick, v.photo_url, c.n
  from c join public.volunteers v on v.id = c.volunteer_id
  where c.n = (select max(n) from c)
$$;

-- ---------------------------------------------------------------
-- Partneri, benefity a vouchery
-- ---------------------------------------------------------------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text not null default '',
  created_at timestamptz not null default now()
);

create table public.partner_pins (
  partner_id uuid primary key references public.partners(id) on delete cascade,
  pin text not null check (pin ~ '^[0-9]{4}$')
);

create table public.benefits (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  tier int not null check (tier between 1 and 4),
  title text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.benefit_uses (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  benefit_id uuid not null references public.benefits(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  year int not null,
  used_at timestamptz not null default now(),
  unique (volunteer_id, benefit_id, year)
);

create table public.voucher_attempts (
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  benefit_id uuid not null references public.benefits(id) on delete cascade,
  failed int not null default 0,
  locked_until timestamptz,
  primary key (volunteer_id, benefit_id)
);

-- Použitie voucheru: overí úroveň, PIN partnera a zablokuje po 3 chybných pokusoch
create or replace function public.redeem_voucher(p_benefit uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v uuid := public.my_volunteer_id();
  b public.benefits;
  a public.voucher_attempts;
  real_pin text;
  y int := extract(year from public.local_today())::int;
  u public.benefit_uses;
begin
  if v is null then return jsonb_build_object('ok', false, 'error', 'no_profile'); end if;
  select * into b from public.benefits where id = p_benefit and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if public.year_count(v) < (array[3,5,7,9])[b.tier] then
    return jsonb_build_object('ok', false, 'error', 'tier');
  end if;
  if exists (select 1 from public.benefit_uses where volunteer_id = v and benefit_id = b.id and year = y) then
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;
  select * into a from public.voucher_attempts where volunteer_id = v and benefit_id = b.id for update;
  if found and a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'locked_until', a.locked_until);
  end if;
  select pin into real_pin from public.partner_pins where partner_id = b.partner_id;
  if real_pin is null or p_pin is distinct from real_pin then
    insert into public.voucher_attempts (volunteer_id, benefit_id, failed) values (v, b.id, 1)
    on conflict (volunteer_id, benefit_id) do update
      set failed = case when public.voucher_attempts.locked_until is not null then 1 else public.voucher_attempts.failed + 1 end,
          locked_until = null
    returning * into a;
    if a.failed >= 3 then
      update public.voucher_attempts set failed = 0, locked_until = now() + interval '5 minutes'
      where volunteer_id = v and benefit_id = b.id returning * into a;
      return jsonb_build_object('ok', false, 'error', 'locked', 'locked_until', a.locked_until);
    end if;
    return jsonb_build_object('ok', false, 'error', 'wrong_pin', 'left', 3 - a.failed);
  end if;
  delete from public.voucher_attempts where volunteer_id = v and benefit_id = b.id;
  insert into public.benefit_uses (volunteer_id, benefit_id, partner_id, year)
  values (v, b.id, b.partner_id, y) returning * into u;
  return jsonb_build_object('ok', true, 'used_at', u.used_at);
end $$;

-- ---------------------------------------------------------------
-- Novinky a upozornenia
-- ---------------------------------------------------------------
create table public.news (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'info' check (kind in ('info','help','photos')),
  title text not null,
  body text not null default '',
  term_id uuid references public.terms(id) on delete set null,
  photos text[] not null default '{}',
  created_by uuid references public.volunteers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- GDPR: úplné vymazanie dobrovoľníka vrátane prihlasovacieho účtu
create or replace function public.admin_delete_volunteer(p uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare u uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select user_id into u from public.volunteers where id = p;
  delete from public.volunteers where id = p;
  if u is not null then delete from auth.users where id = u; end if;
end $$;

-- ---------------------------------------------------------------
-- Oprávnenia (Row Level Security)
-- ---------------------------------------------------------------
alter table public.volunteers enable row level security;
alter table public.volunteer_admin enable row level security;
alter table public.terms enable row level security;
alter table public.participations enable row level security;
alter table public.partners enable row level security;
alter table public.partner_pins enable row level security;
alter table public.benefits enable row level security;
alter table public.benefit_uses enable row level security;
alter table public.voucher_attempts enable row level security;
alter table public.news enable row level security;
alter table public.push_subscriptions enable row level security;

create policy vol_select on public.volunteers for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy vol_update on public.volunteers for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy vol_insert on public.volunteers for insert to authenticated with check (public.is_admin());
create policy vol_delete on public.volunteers for delete to authenticated using (public.is_admin());

create policy va_admin on public.volunteer_admin for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy terms_read on public.terms for select to authenticated using (true);
create policy terms_admin on public.terms for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy part_read on public.participations for select to authenticated using (volunteer_id = public.my_volunteer_id() or public.is_admin());
create policy part_rsvp on public.participations for insert to authenticated with check (
  public.is_admin() or (
    volunteer_id = public.my_volunteer_id() and status = 'rsvp' and source = 'app' and term_id is not null
    and exists (select 1 from public.terms t where t.id = term_id and t.date >= public.local_today())
  )
);
create policy part_admin_update on public.participations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy part_delete on public.participations for delete to authenticated using (
  public.is_admin() or (volunteer_id = public.my_volunteer_id() and status = 'rsvp')
);

create policy partners_read on public.partners for select to authenticated using (true);
create policy partners_admin on public.partners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pins_admin on public.partner_pins for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy benefits_read on public.benefits for select to authenticated using (true);
create policy benefits_admin on public.benefits for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy uses_read on public.benefit_uses for select to authenticated using (volunteer_id = public.my_volunteer_id() or public.is_admin());
create policy uses_admin on public.benefit_uses for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy attempts_admin on public.voucher_attempts for select to authenticated using (public.is_admin());

create policy news_read on public.news for select to authenticated using (true);
create policy news_admin on public.news for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy push_own on public.push_subscriptions for all to authenticated
  using (volunteer_id = public.my_volunteer_id() or public.is_admin())
  with check (volunteer_id = public.my_volunteer_id());

-- Funkcie môže volať len prihlásený používateľ
revoke execute on function public.my_volunteer_id(), public.is_admin(), public.year_count(uuid), public.term_counts(),
  public.month_leaders(), public.redeem_voucher(uuid, text), public.admin_delete_volunteer(uuid) from public, anon;
grant execute on function public.my_volunteer_id(), public.is_admin(), public.year_count(uuid), public.term_counts(),
  public.month_leaders(), public.redeem_voucher(uuid, text), public.admin_delete_volunteer(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Úložisko fotiek
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
       ('news', 'news', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy avatars_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy news_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'news' and public.is_admin());
create policy news_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'news' and public.is_admin());

-- ---------------------------------------------------------------
-- Počiatočné údaje: partneri a benefity z pôvodného návrhu
-- ---------------------------------------------------------------
with p as (
  insert into public.partners (name, place) values
    ('Fabrika 61', 'Bar, vstup a podujatia vo Fabrike'),
    ('Panička – krajčírstvo', 'Partizánske'),
    ('Hvezdáreň Partizánske', 'Večerné pozorovania')
  returning id, name
), pins as (
  insert into public.partner_pins (partner_id, pin)
  select id, lpad((floor(random() * 10000))::int::text, 4, '0') from p
)
insert into public.benefits (partner_id, tier, title)
select p.id, b.tier, b.title from p join (values
  ('Fabrika 61', 1, 'Zľava 20 % na vstupné na podujatia vo Fabrike 61'),
  ('Panička – krajčírstvo', 2, 'Zľava 10 % na úpravy oblečenia'),
  ('Hvezdáreň Partizánske', 3, 'Voľný vstup na večerné pozorovanie')
) as b(partner, tier, title) on b.partner = p.name;
