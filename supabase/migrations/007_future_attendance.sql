-- Účasť sa dá potvrdiť alebo označiť "neprišiel" až v deň termínu a neskôr
create or replace function public.check_attendance_date() returns trigger
language plpgsql as $$
declare d date;
begin
  if new.status in ('confirmed','cancelled') and new.term_id is not null then
    select date into d from public.terms where id = new.term_id;
    if d > public.local_today() then
      raise exception 'Účasť sa dá potvrdiť až v deň termínu.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists participations_date_check on public.participations;
create trigger participations_date_check before insert or update of status on public.participations
for each row execute function public.check_attendance_date();
