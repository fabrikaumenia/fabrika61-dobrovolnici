-- Doplnenie oprávnení k fotkám (čítanie a prepis vlastných súborov)
create policy avatars_read on storage.objects for select to authenticated using (bucket_id in ('avatars','news'));
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
