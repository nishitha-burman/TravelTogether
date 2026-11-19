begin;
alter table public.itineraries add column timezone text;
alter table public.itinerary_events add column updated_at timestamptz not null default now();
alter table public.itinerary_events add column sequence integer not null default 0 check (sequence >= 0);

create or replace function public.validate_trip_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.timezone is not null and not exists (select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then
    raise exception 'Choose a valid IANA timezone' using errcode='22023';
  end if;
  return new;
end $$;
create trigger validate_trip_timezone before insert or update of timezone on public.itineraries
for each row execute function public.validate_trip_timezone();

create or replace function public.version_itinerary_event()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); new.sequence := old.sequence + 1; return new; end $$;
create trigger version_itinerary_event before update on public.itinerary_events
for each row execute function public.version_itinerary_event();

create or replace function public.touch_trip_content()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.itineraries set updated_at=now() where id=coalesce(new.itinerary_id,old.itinerary_id);
  return coalesce(new,old);
end $$;
create trigger events_touch_trip after insert or update or delete on public.itinerary_events for each row execute function public.touch_trip_content();
create trigger days_touch_trip after insert or update or delete on public.trip_days for each row execute function public.touch_trip_content();
create trigger markers_touch_trip after insert or update or delete on public.itinerary_markers for each row execute function public.touch_trip_content();

create or replace function public.version_day_events()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.day_date is distinct from old.day_date then
    update public.itinerary_events set updated_at=now() where day_id=new.id;
  end if;
  return new;
end $$;
create trigger version_day_events after update of day_date on public.trip_days for each row execute function public.version_day_events();
create or replace function public.version_timezone_events()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.timezone is distinct from old.timezone then
    update public.itinerary_events set updated_at=now() where itinerary_id=new.id;
  end if;
  return new;
end $$;
create trigger version_timezone_events after update of timezone on public.itineraries for each row execute function public.version_timezone_events();

create or replace function public.assign_trip_dates(target_id uuid, first_date date, trip_timezone text)
returns void language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  perform 1 from public.itineraries where id=target_id for update;
  if not public.can_edit_itinerary(target_id) then raise exception 'Editing access required' using errcode='42501'; end if;
  if first_date is null or trip_timezone is null then raise exception 'Start date and timezone required' using errcode='22023'; end if;
  select count(*) into total from public.trip_days where itinerary_id=target_id;
  if total=0 then raise exception 'Add a trip day first' using errcode='22023'; end if;
  update public.trip_days set day_date=first_date + (day_number-1) where itinerary_id=target_id;
  update public.itineraries set planning_mode='date_range', start_date=first_date,
    end_date=first_date+(total-1), timezone=trip_timezone, trip_length_days=total where id=target_id;
end $$;

create or replace function public.append_trip_day(target_id uuid, day_label text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare trip public.itineraries; next_number integer; result uuid; next_date date;
begin
  select * into trip from public.itineraries where id=target_id for update;
  if not public.can_edit_itinerary(target_id) then raise exception 'Editing access required' using errcode='42501'; end if;
  select coalesce(max(day_number),0)+1 into next_number from public.trip_days where itinerary_id=target_id;
  if next_number>120 or length(day_label)>80 then raise exception 'Trip or label is too long' using errcode='22023'; end if;
  next_date := case when trip.end_date is not null then trip.end_date+1 else null end;
  insert into public.trip_days(itinerary_id,day_number,label,day_date) values(target_id,next_number,nullif(day_label,''),next_date) returning id into result;
  update public.itineraries set trip_length_days=next_number,end_date=next_date where id=target_id;
  return result;
end $$;

create or replace function public.delete_trip_day(target_id uuid, target_day_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare trip public.itineraries; d record; n integer := 0;
begin
  select * into trip from public.itineraries where id=target_id for update;
  if not public.can_edit_itinerary(target_id) then raise exception 'Editing access required' using errcode='42501'; end if;
  if (select count(*) from public.trip_days where itinerary_id=target_id)<=1 then raise exception 'Keep at least one day' using errcode='22023'; end if;
  delete from public.trip_days where id=target_day_id and itinerary_id=target_id;
  if not found then raise exception 'Day not found' using errcode='P0002'; end if;
  -- Ascending updates fill the gap without colliding with the unique day number.
  -- Calendar dates stay attached to their days; deleting a day never silently moves bookings.
  for d in select id from public.trip_days where itinerary_id=target_id order by day_number loop
    n:=n+1; update public.trip_days set day_number=n where id=d.id;
  end loop;
  update public.itineraries set trip_length_days=n,
    start_date=(select min(day_date) from public.trip_days where itinerary_id=target_id),
    end_date=(select max(day_date) from public.trip_days where itinerary_id=target_id) where id=target_id;
end $$;

create or replace function public.create_trip_plan(trip_title text, trip_city text, total_days integer,
  first_date date default null, trip_timezone text default null, public_trip boolean default false, image_url text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if total_days is null or total_days<1 or total_days>120 or coalesce(length(trim(trip_title)),0) not between 1 and 120
    or coalesce(length(trim(trip_city)),0) not between 1 and 120 then raise exception 'Invalid trip details' using errcode='22023'; end if;
  insert into public.itineraries(owner_id,title,city,destination,planning_mode,start_date,end_date,timezone,trip_length_days,is_public,public_slug,theme_image_url)
    values(auth.uid(),trim(trip_title),trim(trip_city),trim(trip_city),case when first_date is null then 'days' else 'date_range' end,
      first_date,first_date+(total_days-1),trip_timezone,total_days,public_trip,gen_random_uuid()::text,image_url) returning id into result;
  insert into public.trip_days(itinerary_id,day_number,day_date)
    select result,n,first_date+(n-1) from generate_series(1,total_days) n;
  return result;
end $$;

revoke all on function public.assign_trip_dates(uuid,date,text), public.append_trip_day(uuid,text),
  public.delete_trip_day(uuid,uuid), public.create_trip_plan(text,text,integer,date,text,boolean,text) from public, anon;
grant execute on function public.assign_trip_dates(uuid,date,text), public.append_trip_day(uuid,text),
  public.delete_trip_day(uuid,uuid), public.create_trip_plan(text,text,integer,date,text,boolean,text) to authenticated;

-- An explicit public projection: no owner/member identifiers, notes, booking links or raw metadata.
create or replace function public.get_public_itinerary(share_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'trip', jsonb_build_object('id',i.id,'title',i.title,'destination',i.destination,'theme_image_url',i.theme_image_url,
      'planning_mode',i.planning_mode,'trip_length_days',i.trip_length_days,'start_date',i.start_date,'end_date',i.end_date,'timezone',i.timezone),
    'days',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'day_number',d.day_number,'label',d.label,'day_date',d.day_date) order by d.day_number)
      from public.trip_days d where d.itinerary_id=i.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'day_id',e.day_id,'title',e.title,'event_type',e.event_type,'start_time',e.start_time,'end_time',e.end_time) order by e.start_time nulls first,e.id)
      from public.itinerary_events e where e.itinerary_id=i.id),'[]'::jsonb),
    'markers',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'latitude',m.latitude,'longitude',m.longitude) order by m.name)
      from public.itinerary_markers m where m.itinerary_id=i.id),'[]'::jsonb))
  from public.itineraries i where i.public_slug=share_slug and i.is_public;
$$;
revoke all on function public.get_public_itinerary(text) from public;
grant execute on function public.get_public_itinerary(text) to anon, authenticated;
commit;
