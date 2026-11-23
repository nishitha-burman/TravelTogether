begin;

-- One owner-authorized transaction keeps the title, duration and day dates consistent.
create or replace function public.update_trip_details(
  target_id uuid, new_title text, plan_mode text default null,
  total_days integer default null, first_date date default null, trip_timezone text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare existing public.itineraries%rowtype; current_days integer; d record; n integer := 0;
begin
  select * into existing from public.itineraries where id=target_id for update;
  if not found then raise exception 'Trip not found' using errcode='P0002'; end if;
  if auth.uid() is null or existing.owner_id <> auth.uid() then
    raise exception 'Only the owner can edit trip details' using errcode='42501';
  end if;
  if coalesce(length(trim(new_title)),0) not between 1 and 120 then
    raise exception 'Choose a title between 1 and 120 characters' using errcode='22023';
  end if;
  if plan_mode is null then
    update public.itineraries set title=trim(new_title) where id=target_id;
    return;
  end if;
  if plan_mode not in ('days','date_range') or total_days is null or total_days not between 1 and 120
    or (plan_mode='date_range' and first_date is null) or (plan_mode='days' and first_date is not null) then
    raise exception 'Choose a valid trip length or date range' using errcode='22023';
  end if;
  if trip_timezone is not null and not exists(select 1 from pg_catalog.pg_timezone_names where name=trip_timezone) then
    raise exception 'Choose a valid timezone' using errcode='22023';
  end if;

  -- Use day order, not date, so gaps and previously deleted days do not move events between days.
  if exists (
    select 1 from public.itinerary_events e join (
      select id, row_number() over(order by day_number,id) as day_rank
      from public.trip_days where itinerary_id=target_id
    ) candidate_days on candidate_days.id=e.day_id where candidate_days.day_rank>total_days
  ) then
    raise exception 'Clear events from the days being removed before shortening the trip' using errcode='23514';
  end if;
  delete from public.trip_days where id in (
    select id from public.trip_days where itinerary_id=target_id order by day_number,id offset total_days
  );
  for d in select id from public.trip_days where itinerary_id=target_id order by day_number,id loop
    n:=n+1;
    update public.trip_days set day_number=n,
      day_date=case when plan_mode='date_range' then first_date+(n-1) else null end where id=d.id;
  end loop;
  current_days:=n;
  if current_days<total_days then
    insert into public.trip_days(itinerary_id,day_number,day_date)
    select target_id,i,case when plan_mode='date_range' then first_date+(i-1) else null end
    from generate_series(current_days+1,total_days) i;
  end if;
  -- Existing day-date and timezone triggers update calendar event revisions.
  update public.itineraries set title=trim(new_title), planning_mode=plan_mode,
    trip_length_days=total_days, timezone=trip_timezone,
    start_date=case when plan_mode='date_range' then first_date else null end,
    end_date=case when plan_mode='date_range' then first_date+(total_days-1) else null end
  where id=target_id;
end $$;

revoke all on function public.update_trip_details(uuid,text,text,integer,date,text) from public,anon;
grant execute on function public.update_trip_details(uuid,text,text,integer,date,text) to authenticated;
commit;
