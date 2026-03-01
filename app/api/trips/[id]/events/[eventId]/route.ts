import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripOwner } from "@/lib/api-auth";

const updateSchema = z.object({
  title: z.string().min(1).max(120),
  eventType: z.enum(["stay", "museum", "travel", "food", "activity", "custom"]),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id, eventId } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user || !auth.supabase) {
    return auth.error;
  }

  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("itinerary_events")
    .update({
      title: body.data.title,
      event_type: body.data.eventType,
      start_time: body.data.startTime || null,
      end_time: body.data.endTime || null,
      notes: body.data.notes || null,
      metadata: body.data.metadata ?? {}
    })
    .eq("id", eventId)
    .eq("itinerary_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id, eventId } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user || !auth.supabase) {
    return auth.error;
  }

  const { error } = await auth.supabase
    .from("itinerary_events")
    .delete()
    .eq("id", eventId)
    .eq("itinerary_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
