begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 2097152,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- One private photo per account; replacement does not accumulate old objects.
create policy profile_photo_self_read on storage.objects for select to authenticated
using (bucket_id = 'profile-photos' and name = auth.uid()::text || '/avatar');
create policy profile_photo_self_insert on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and name = auth.uid()::text || '/avatar');
create policy profile_photo_self_update on storage.objects for update to authenticated
using (bucket_id = 'profile-photos' and name = auth.uid()::text || '/avatar')
with check (bucket_id = 'profile-photos' and name = auth.uid()::text || '/avatar');

-- Auth changes email only through its verification flow. Keep the private mirror current.
create function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;
revoke all on function public.sync_profile_email() from public, anon, authenticated;
create trigger on_auth_user_email_updated after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_profile_email();

commit;
