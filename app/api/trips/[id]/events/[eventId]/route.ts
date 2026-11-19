import { NextResponse } from "next/server";
import { eventSchema, validEventTimes } from "@/lib/schemas";
import { requireTripEditor } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const { id, eventId } = await params;
  const auth = await requireTripEditor(id, request);
  if (auth.error || !auth.user || !auth.supabase) {
    return auth.error;
  }

  const body = eventSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !validEventTimes(body.data)) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("itinerary_events")
    .update({
      title: body.data.title,
      event_type: body.data.eventType,
      start_time: body.data.startTime || null,
      end_time: body.data.endTime || null,
      notes: body.data.notes || null,
      metadata: body.data.metadata ?? {},
    })
    .eq("id", eventId)
    .eq("itinerary_id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not save this change. Please retry." }, { status: 400 });
  }

  if (!data) return NextResponse.json({ error: "This event is no longer available." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const { id, eventId } = await params;
  const auth = await requireTripEditor(id, request);
  if (auth.error || !auth.user || !auth.supabase) {
    return auth.error;
  }

  const { data, error } = await auth.supabase
    .from("itinerary_events")
    .delete()
    .eq("id", eventId)
    .eq("itinerary_id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not save this change. Please retry." }, { status: 400 });
  }

  if (!data) return NextResponse.json({ error: "This event is no longer available." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
