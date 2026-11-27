-- Benefity v2: opakované použitie, vyššie verzie toho istého benefitu, online zľavy s kódom
alter table public.benefits
  add column if not exists group_key text,
  add column if not exists max_uses int check (max_uses is null or max_uses > 0),
  add column if not exists online_url text,
  add column if not exists online_code text;

do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.benefit_uses'::regclass and contype = 'u';
  if c is not null then execute 'alter table public.benefit_uses drop constraint ' || quote_ident(c); end if;
end $$;
create index if not exists benefit_uses_lookup on public.benefit_uses(volunteer_id, benefit_id, year);

create or replace function public.redeem_voucher(p_benefit uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v uuid := public.my_volunteer_id();
  b public.benefits;
  a public.voucher_attempts;
  real_pin text;
  y int := extract(year from public.local_today())::int;
  n int := public.year_count(public.my_volunteer_id());
  u public.benefit_uses;
begin
  if v is null then return jsonb_build_object('ok', false, 'error', 'no_profile'); end if;
  select * into b from public.benefits where id = p_benefit and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if b.online_url is not null then return jsonb_build_object('ok', false, 'error', 'online'); end if;
  if n < (array[3,5,7,9])[b.tier] then return jsonb_build_object('ok', false, 'error', 'tier'); end if;
  if b.group_key is not null and exists (
    select 1 from public.benefits h where h.active and h.group_key = b.group_key and h.tier > b.tier and n >= (array[3,5,7,9])[h.tier]
  ) then return jsonb_build_object('ok', false, 'error', 'superseded'); end if;
  if b.max_uses is not null and (select count(*) from public.benefit_uses where volunteer_id = v and benefit_id = b.id and year = y) >= b.max_uses then
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
