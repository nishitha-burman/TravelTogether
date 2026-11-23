import { NextResponse } from "next/server";
import { requireTripOwner } from "@/lib/api-auth";
import { dateRangeDays, tripDetailsSchema } from "@/lib/schemas";
import { mutationError } from "@/lib/api-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const parsed = tripDetailsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the trip details." },
      { status: 400 },
    );
  const value = parsed.data;
  const { error } = await auth.supabase.rpc("update_trip_details", {
    target_id: id,
    new_title: value.title,
    plan_mode: value.planningMode ?? null,
    total_days:
      value.planningMode === "date_range"
        ? dateRangeDays(value.startDate!, value.endDate!)
        : (value.tripLengthDays ?? null),
    first_date: value.planningMode === "date_range" ? value.startDate : null,
    trip_timezone: value.timezone ?? null,
  });
  if (error?.code === "23514")
    return NextResponse.json(
      {
        error:
          "Some days being removed contain events. Clear those events first; your trip has not been changed.",
      },
      { status: 409 },
    );
  if (error)
    return mutationError(
      error,
      "Could not update your trip. Please check the details and retry.",
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user || !auth.supabase) {
    return auth.error;
  }

  const { error } = await auth.supabase
    .from("itineraries")
    .delete()
    .eq("id", id)
    .eq("owner_id", auth.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Could not save this change. Please retry." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
