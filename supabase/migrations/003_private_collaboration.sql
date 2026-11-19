-- Deploy before the new app. Public access is exclusively through the allowlisted RPC.
begin;

create or replace function public.trip_role(target_itinerary_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when i.owner_id = auth.uid() then 'owner' else m.role end
  from public.itineraries i left join public.itinerary_members m
    on m.itinerary_id = i.id and m.user_id = auth.uid()
  where i.id = target_itinerary_id and auth.uid() is not null;
$$;
revoke all on function public.trip_role(uuid) from public;
grant execute on function public.trip_role(uuid) to anon, authenticated;

create or replace function public.can_access_itinerary(target_itinerary_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.trip_role(target_itinerary_id) in ('owner', 'editor', 'viewer'), false);
$$;
revoke all on function public.can_access_itinerary(uuid) from public;
grant execute on function public.can_access_itinerary(uuid) to anon, authenticated;

create or replace function public.can_edit_itinerary(target_itinerary_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.trip_role(target_itinerary_id) in ('owner', 'editor'), false);
$$;
revoke all on function public.can_edit_itinerary(uuid) from public;
grant execute on function public.can_edit_itinerary(uuid) to anon, authenticated;

drop policy if exists members_read_accessible on public.itinerary_members;
create policy members_read_accessible on public.itinerary_members for select
using (user_id = auth.uid() or public.trip_role(itinerary_id) = 'owner');

drop policy if exists days_owner_manage on public.trip_days;
drop policy if exists events_owner_manage on public.itinerary_events;
drop policy if exists markers_owner_manage on public.itinerary_markers;
create policy days_editor_manage on public.trip_days for all
using (public.can_edit_itinerary(itinerary_id)) with check (public.can_edit_itinerary(itinerary_id));
create policy events_editor_manage on public.itinerary_events for all
using (public.can_edit_itinerary(itinerary_id)) with check (public.can_edit_itinerary(itinerary_id));
create policy markers_editor_manage on public.itinerary_markers for all
using (public.can_edit_itinerary(itinerary_id)) with check (public.can_edit_itinerary(itinerary_id));

-- Stop with a useful diagnostic rather than silently deleting inconsistent user data.
do $$ begin
  if exists (select 1 from public.itinerary_events e join public.trip_days d on d.id = e.day_id where e.itinerary_id <> d.itinerary_id) then
    raise exception 'Cross-trip event/day references exist. Repair these rows before migration 003.';
  end if;
end $$;
alter table public.trip_days add constraint trip_days_id_itinerary_unique unique (id, itinerary_id);
alter table public.itinerary_events add constraint events_day_same_itinerary
foreign key (day_id, itinerary_id) references public.trip_days(id, itinerary_id) on delete cascade;

alter table public.itinerary_invites add column role text not null default 'viewer' check (role in ('viewer','editor'));

create or replace function public.accept_pending_invites()
returns integer language plpgsql security definer set search_path = '' as $$
declare invitation record; accepted integer := 0; user_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  -- Read the authenticated account, not caller-supplied email or user id.
  select lower(email) into user_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if user_email is null then return 0; end if;
  for invitation in select * from public.itinerary_invites
    where lower(invited_email) = user_email and accepted_at is null order by created_at, id for update
  loop
    insert into public.itinerary_members(itinerary_id, user_id, role)
    values (invitation.itinerary_id, auth.uid(), invitation.role)
    on conflict (itinerary_id, user_id) do nothing;
    update public.itinerary_invites set accepted_at = now() where id = invitation.id;
    accepted := accepted + 1;
  end loop;
  return accepted;
end $$;
revoke all on function public.accept_pending_invites() from public, anon;
grant execute on function public.accept_pending_invites() to authenticated;

create or replace function public.trip_collaborators(target_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if public.trip_role(target_id) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role) order by m.created_at)
      from public.itinerary_members m join auth.users u on u.id=m.user_id where m.itinerary_id=target_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'email',v.invited_email,'role',v.role) order by v.created_at)
      from public.itinerary_invites v where v.itinerary_id=target_id and v.accepted_at is null), '[]'::jsonb));
end $$;
revoke all on function public.trip_collaborators(uuid) from public, anon;
grant execute on function public.trip_collaborators(uuid) to authenticated;

-- Public images are intentionally cover art, never private booking documents.
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id='trip-images';
drop policy if exists trip_images_authenticated_upload on storage.objects;
create policy trip_images_owner_upload on storage.objects for insert to authenticated
with check (bucket_id='trip-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy trip_images_owner_delete on storage.objects for delete to authenticated
using (bucket_id='trip-images' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
