-- Malá funkcia na udržanie projektu aktívneho (volá ju týždenná úloha na GitHube)
create or replace function public.ping() returns text language sql stable as $$ select 'ok'::text $$;
grant execute on function public.ping() to anon, authenticated;
