-- Prístup prihláseným používateľom k tabuľkám. Čo presne smú vidieť a meniť, určujú pravidlá RLS v 001.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
revoke all on all tables in schema public from anon;
