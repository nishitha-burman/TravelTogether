import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripOwner } from "@/lib/api-auth";

const payloadSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = payloadSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid marker payload" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("itinerary_markers").insert({
    itinerary_id: id,
    name: body.data.name,
    description: body.data.description || null,
    latitude: body.data.latitude,
    longitude: body.data.longitude
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
