import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripOwner } from "@/lib/api-auth";

const payloadSchema = z.object({
  dayId: z.string().uuid(),
  title: z.string().min(1).max(120),
  eventType: z.enum(["stay", "museum", "travel", "food", "activity", "custom"]),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = payloadSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("itinerary_events").insert({
    itinerary_id: id,
    day_id: body.data.dayId,
    title: body.data.title,
    event_type: body.data.eventType,
    start_time: body.data.startTime || null,
    end_time: body.data.endTime || null,
    notes: body.data.notes || null,
    metadata: body.data.metadata ?? {}
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
