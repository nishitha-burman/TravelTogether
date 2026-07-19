import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { buildTripCalendar, calendarFilename } from "@/lib/calendar/ics";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user || !auth.supabase) return auth.error;

  const { data: trip, error: tripError } = await auth.supabase
    .from("itineraries")
    .select("id, title, destination")
    .eq("id", id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found or you do not have access" }, { status: 404 });
  }

  const [daysResult, eventsResult] = await Promise.all([
    auth.supabase
      .from("trip_days")
      .select("id, day_date")
      .eq("itinerary_id", id),
    auth.supabase
      .from("itinerary_events")
      .select("id, day_id, title, event_type, start_time, end_time, notes, metadata")
      .eq("itinerary_id", id)
  ]);

  if (daysResult.error || eventsResult.error) {
    const missingDateColumn = daysResult.error?.message.toLowerCase().includes("day_date");
    return NextResponse.json(
      {
        error: missingDateColumn
          ? "Calendar export requires the trip_days.day_date migration"
          : daysResult.error?.message || eventsResult.error?.message || "Could not create calendar"
      },
      { status: missingDateColumn ? 422 : 500 }
    );
  }

  const days = daysResult.data ?? [];
  const events = eventsResult.data ?? [];
  const datesByDayId = new Map(days.map((day) => [day.id, day.day_date]));

  if (events.length === 0) {
    return NextResponse.json({ error: "Add at least one timeline event before exporting" }, { status: 422 });
  }

  if (events.some((event) => !datesByDayId.get(event.day_id))) {
    return NextResponse.json(
      { error: "Every timeline event needs a calendar date before this trip can be exported" },
      { status: 422 }
    );
  }

  const calendar = buildTripCalendar({ trip, days, events });
  return new Response(calendar, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${calendarFilename(trip.title)}"`,
      "Content-Type": "text/calendar; charset=utf-8"
    }
  });
}
