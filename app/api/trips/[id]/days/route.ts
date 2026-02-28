import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripOwner } from "@/lib/api-auth";

const payloadSchema = z.object({ label: z.string().max(80).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = payloadSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid day payload" }, { status: 400 });
  }

  const { count } = await auth.supabase
    .from("trip_days")
    .select("id", { head: true, count: "exact" })
    .eq("itinerary_id", id);

  const nextNumber = (count ?? 0) + 1;

  const { error: dayError } = await auth.supabase.from("trip_days").insert({
    itinerary_id: id,
    day_number: nextNumber,
    label: body.data.label || null
  });

  if (dayError) {
    return NextResponse.json({ error: dayError.message }, { status: 400 });
  }

  await auth.supabase
    .from("itineraries")
    .update({ trip_length_days: nextNumber })
    .eq("id", id)
    .eq("owner_id", auth.user.id);

  return NextResponse.json({ ok: true }, { status: 201 });
}
