alter table if exists public.itineraries
  add column if not exists city text;

alter table if exists public.itineraries
  add column if not exists planning_mode text not null default 'days' check (planning_mode in ('days', 'date_range'));

alter table if exists public.itineraries
  add column if not exists start_date date;

alter table if exists public.itineraries
  add column if not exists end_date date;

alter table if exists public.trip_days
  add column if not exists day_date date;

update public.itineraries
set city = coalesce(city, destination)
where city is null;
