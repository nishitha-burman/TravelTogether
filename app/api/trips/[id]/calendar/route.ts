import { NextResponse } from "next/server";
import { requireTripAccess } from "@/lib/api-auth";
import { readTrips, readTimeline } from "@/lib/server/trip-data";
import { buildTripCalendar, calendarFilename } from "@/lib/calendar/ics";
import { calendarReadiness } from "@/lib/calendar/readiness";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripAccess(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  try {
    const [[trip], { days, events }] = await Promise.all([
      readTrips(auth.supabase, [id]),
      readTimeline(auth.supabase, [id]),
    ]);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    const readiness = calendarReadiness(trip.timezone, days, events);
    if (!readiness.ready) return NextResponse.json({ error: readiness.issues.join(" ") }, { status: 422 });
    return new Response(buildTripCalendar({ trip, days, events }), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${calendarFilename(trip.title)}"`,
        "Content-Type": "text/calendar; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not prepare your calendar. Please try again." },
      { status: 500 },
    );
  }
}
