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

  const [{ count }, { data: itinerary }] = await Promise.all([
    auth.supabase
    .from("trip_days")
    .select("id", { head: true, count: "exact" })
    .eq("itinerary_id", id),
    auth.supabase
      .from("itineraries")
      .select("planning_mode, end_date")
      .eq("id", id)
      .single()
  ]);

  const nextNumber = (count ?? 0) + 1;
  let nextDayDate: string | null = null;
  if (itinerary?.planning_mode === "date_range" && itinerary.end_date) {
    const endDate = new Date(`${itinerary.end_date}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    nextDayDate = endDate.toISOString().slice(0, 10);
  }

  let dayError = (await auth.supabase.from("trip_days").insert({
    itinerary_id: id,
    day_number: nextNumber,
    label: body.data.label || null,
    day_date: nextDayDate
  })).error;

  if (dayError && dayError.message.toLowerCase().includes("day_date")) {
    dayError = (await auth.supabase.from("trip_days").insert({
      itinerary_id: id,
      day_number: nextNumber,
      label: body.data.label || null
    })).error;
  }

  if (dayError) {
    return NextResponse.json({ error: dayError.message }, { status: 400 });
  }

  const itineraryUpdate = await auth.supabase
    .from("itineraries")
    .update({
      trip_length_days: nextNumber,
      end_date: nextDayDate ?? itinerary?.end_date ?? null
    })
    .eq("id", id)
    .eq("owner_id", auth.user.id);

  if (itineraryUpdate.error && itineraryUpdate.error.message.toLowerCase().includes("end_date")) {
    await auth.supabase
      .from("itineraries")
      .update({ trip_length_days: nextNumber })
      .eq("id", id)
      .eq("owner_id", auth.user.id);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
