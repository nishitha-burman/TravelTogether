import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireTripOwner } from "@/lib/api-auth";

const updateSchema = z.object({
  label: z.string().max(80).nullable().optional()
});

async function syncDayNumbersAndLength(itineraryId: string, supabase: SupabaseClient) {
  const { data: days, error: fetchError } = await supabase
    .from("trip_days")
    .select("id, day_date")
    .eq("itinerary_id", itineraryId)
    .order("day_number", { ascending: true });

  if (fetchError || !days) return;

  await Promise.all(
    days.map((day, index) =>
      supabase.from("trip_days").update({ day_number: index + 1 }).eq("id", day.id).eq("itinerary_id", itineraryId)
    )
  );

  const lastDate = days
    .map((day) => day.day_date)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const updatePayload: { trip_length_days: number; end_date?: string | null } = { trip_length_days: days.length };
  if (lastDate) {
    updatePayload.end_date = lastDate;
  }

  const update = await supabase.from("itineraries").update(updatePayload).eq("id", itineraryId);
  if (update.error && update.error.message.toLowerCase().includes("end_date")) {
    await supabase.from("itineraries").update({ trip_length_days: days.length }).eq("id", itineraryId);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  const { id, dayId } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user || !auth.supabase) {
    return auth.error;
  }

  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid day payload" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("trip_days")
    .update({ label: body.data.label || null })
    .eq("id", dayId)
    .eq("itinerary_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  const { id, dayId } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user || !auth.supabase) {
    return auth.error;
  }

  const { error } = await auth.supabase
    .from("trip_days")
    .delete()
    .eq("id", dayId)
    .eq("itinerary_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await syncDayNumbersAndLength(id, auth.supabase);

  return NextResponse.json({ ok: true });
}
