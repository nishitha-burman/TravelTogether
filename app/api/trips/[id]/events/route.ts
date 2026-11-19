import { NextResponse } from "next/server";
import { createEventSchema, validEventTimes } from "@/lib/schemas";
import { requireTripEditor } from "@/lib/api-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripEditor(id, request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = createEventSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !validEventTimes(body.data)) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const { data: day } = await auth.supabase
    .from("trip_days")
    .select("id")
    .eq("id", body.data.dayId)
    .eq("itinerary_id", id)
    .maybeSingle();
  if (!day) return NextResponse.json({ error: "Choose a day in this trip." }, { status: 400 });

  const { error } = await auth.supabase.from("itinerary_events").insert({
    itinerary_id: id,
    day_id: body.data.dayId,
    title: body.data.title,
    event_type: body.data.eventType,
    start_time: body.data.startTime || null,
    end_time: body.data.endTime || null,
    notes: body.data.notes || null,
    metadata: body.data.metadata ?? {},
  });

  if (error) {
    return NextResponse.json({ error: "Could not save this change. Please retry." }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
