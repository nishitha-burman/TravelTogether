create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
select u.id, lower(u.email)
from auth.users u
where u.email is not null
on conflict (id) do update
set email = excluded.email;

create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  theme_image_url text,
  is_public boolean not null default false,
  public_slug text not null unique,
  trip_length_days integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itinerary_members (
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (itinerary_id, user_id)
);

create table if not exists public.itinerary_invites (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  label text,
  created_at timestamptz not null default now(),
  unique (itinerary_id, day_number)
);

create table if not exists public.itinerary_events (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  day_id uuid not null references public.trip_days(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('stay', 'museum', 'travel', 'food', 'activity', 'custom')),
  start_time text,
  end_time text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_markers (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_itineraries_updated_at on public.itineraries;
create trigger set_itineraries_updated_at
before update on public.itineraries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.itineraries enable row level security;
alter table public.itinerary_members enable row level security;
alter table public.itinerary_invites enable row level security;
alter table public.trip_days enable row level security;
alter table public.itinerary_events enable row level security;
alter table public.itinerary_markers enable row level security;

create or replace function public.can_access_itinerary(target_itinerary_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.itineraries i
    where i.id = target_itinerary_id
      and (
        i.is_public = true
        or i.owner_id = auth.uid()
        or exists (
          select 1
          from public.itinerary_members m
          where m.itinerary_id = i.id
            and m.user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "profiles_self_read" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "itineraries_read" on public.itineraries;
drop policy if exists "itineraries_owner_insert" on public.itineraries;
drop policy if exists "itineraries_owner_update" on public.itineraries;
drop policy if exists "itineraries_owner_delete" on public.itineraries;
drop policy if exists "members_read_accessible" on public.itinerary_members;
drop policy if exists "members_owner_manage" on public.itinerary_members;
drop policy if exists "invites_owner_manage" on public.itinerary_invites;
drop policy if exists "invites_invited_read" on public.itinerary_invites;
drop policy if exists "days_read_accessible" on public.trip_days;
drop policy if exists "days_owner_manage" on public.trip_days;
drop policy if exists "events_read_accessible" on public.itinerary_events;
drop policy if exists "events_owner_manage" on public.itinerary_events;
drop policy if exists "markers_read_accessible" on public.itinerary_markers;
drop policy if exists "markers_owner_manage" on public.itinerary_markers;

create policy "profiles_self_read"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_self_update"
on public.profiles
for update
using (id = auth.uid());

create policy "itineraries_read"
on public.itineraries
for select
using (public.can_access_itinerary(id));

create policy "itineraries_owner_insert"
on public.itineraries
for insert
with check (owner_id = auth.uid());

create policy "itineraries_owner_update"
on public.itineraries
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "itineraries_owner_delete"
on public.itineraries
for delete
using (owner_id = auth.uid());

create policy "members_read_accessible"
on public.itinerary_members
for select
using (public.can_access_itinerary(itinerary_id));

create policy "members_owner_manage"
on public.itinerary_members
for all
using (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
);

create policy "invites_owner_manage"
on public.itinerary_invites
for all
using (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
);

create policy "invites_invited_read"
on public.itinerary_invites
for select
using (lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email')::text, '')));

create policy "days_read_accessible"
on public.trip_days
for select
using (public.can_access_itinerary(itinerary_id));

create policy "days_owner_manage"
on public.trip_days
for all
using (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
);

create policy "events_read_accessible"
on public.itinerary_events
for select
using (public.can_access_itinerary(itinerary_id));

create policy "events_owner_manage"
on public.itinerary_events
for all
using (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
);

create policy "markers_read_accessible"
on public.itinerary_markers
for select
using (public.can_access_itinerary(itinerary_id));

create policy "markers_owner_manage"
on public.itinerary_markers
for all
using (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.itineraries i
    where i.id = itinerary_id and i.owner_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('trip-images', 'trip-images', true)
on conflict (id) do nothing;

drop policy if exists "trip_images_public_read" on storage.objects;
drop policy if exists "trip_images_authenticated_upload" on storage.objects;

create policy "trip_images_public_read"
on storage.objects
for select
using (bucket_id = 'trip-images');

create policy "trip_images_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'trip-images');
