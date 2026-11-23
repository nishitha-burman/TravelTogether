import type { SupabaseClient } from "@supabase/supabase-js";
import type { TripRow, DayRow, EventRow, MarkerRow } from "@/types/trip";
import { missingColumn } from "@/lib/server/compatibility";
type QueryResult<T> = { data: T[] | null; error: { code: string; message: string } | null };
const core =
  "id, owner_id, title, destination, theme_image_url, is_public, public_slug, trip_length_days, created_at, updated_at";
export async function readTrips(supabase: SupabaseClient, ids: string[]) {
  let result: QueryResult<Partial<TripRow>> = await supabase
    .from("itineraries")
    .select(`${core}, city, planning_mode, start_date, end_date, timezone`)
    .in("id", ids);
  if (missingColumn(result.error))
    result = await supabase
      .from("itineraries")
      .select(`${core}, city, planning_mode, start_date, end_date`)
      .in("id", ids);
  if (missingColumn(result.error)) result = await supabase.from("itineraries").select(core).in("id", ids);
  if (result.error) throw new Error("Could not load trips. Please try again.");
  return (result.data ?? []).map((row) => {
    const trip = row as unknown as TripRow;
    return {
      ...trip,
      city: trip.city ?? trip.destination,
      planning_mode: trip.planning_mode ?? "days",
      start_date: trip.start_date ?? null,
      end_date: trip.end_date ?? null,
      timezone: trip.timezone ?? null,
    };
  });
}
export async function readTimeline(supabase: SupabaseClient, ids: string[]) {
  const results = await Promise.all([
    supabase
      .from("trip_days")
      .select("id,itinerary_id,day_number,label,day_date")
      .in("itinerary_id", ids)
      .order("day_number"),
    supabase
      .from("itinerary_events")
      .select(
        "id,itinerary_id,day_id,title,event_type,start_time,end_time,notes,metadata,updated_at,sequence",
      )
      .in("itinerary_id", ids)
      .order("start_time", { nullsFirst: true })
      .order("created_at")
      .order("id"),
  ]);
  let days: QueryResult<DayRow> = results[0];
  let events: QueryResult<EventRow> = results[1];
  if (missingColumn(days.error)) {
    const result = await supabase
      .from("trip_days")
      .select("id,itinerary_id,day_number,label")
      .in("itinerary_id", ids)
      .order("day_number");
    days = { ...result, data: result.data?.map((day) => ({ ...day, day_date: null })) ?? null };
  }
  if (missingColumn(events.error)) {
    const result = await supabase
      .from("itinerary_events")
      .select("id,itinerary_id,day_id,title,event_type,start_time,end_time,notes,metadata,created_at")
      .in("itinerary_id", ids)
      .order("start_time", { nullsFirst: true })
      .order("created_at")
      .order("id");
    events = {
      ...result,
      data: result.data?.map((e) => ({ ...e, sequence: 0, updated_at: e.created_at })) ?? null,
    };
  }
  if (days.error || events.error) throw new Error("Could not load the timeline. Please try again.");
  return { days: days.data as DayRow[], events: events.data as EventRow[] };
}
export async function readMarkers(supabase: SupabaseClient, id: string) {
  const result = await supabase
    .from("itinerary_markers")
    .select("id,itinerary_id,name,description,latitude,longitude")
    .eq("itinerary_id", id);
  if (result.error) throw new Error("Could not load saved places. Please try again.");
  return result.data as MarkerRow[];
}
