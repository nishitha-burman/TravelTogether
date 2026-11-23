-- Preserve addition order for untimed events without exposing creation metadata.
begin;
-- An explicit public projection: no owner/member identifiers, notes, booking links or raw metadata.
create or replace function public.get_public_itinerary(share_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'trip', jsonb_build_object('id',i.id,'title',i.title,'destination',i.destination,'theme_image_url',i.theme_image_url,
      'planning_mode',i.planning_mode,'trip_length_days',i.trip_length_days,'start_date',i.start_date,'end_date',i.end_date,'timezone',i.timezone),
    'days',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'day_number',d.day_number,'label',d.label,'day_date',d.day_date) order by d.day_number)
      from public.trip_days d where d.itinerary_id=i.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'day_id',e.day_id,'title',e.title,'event_type',e.event_type,'start_time',e.start_time,'end_time',e.end_time) order by e.start_time nulls first,e.created_at,e.id)
      from public.itinerary_events e where e.itinerary_id=i.id),'[]'::jsonb),
    'markers',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'latitude',m.latitude,'longitude',m.longitude) order by m.name)
      from public.itinerary_markers m where m.itinerary_id=i.id),'[]'::jsonb))
  from public.itineraries i where i.public_slug=share_slug and i.is_public;
$$;
revoke all on function public.get_public_itinerary(text) from public;
grant execute on function public.get_public_itinerary(text) to anon, authenticated;
commit;
