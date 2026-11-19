import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripEditor } from "@/lib/api-auth";
import { mutationError } from "@/lib/api-response";
type Context = { params: Promise<{ id: string; dayId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const { id, dayId } = await params;
  const auth = await requireTripEditor(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const body = z
    .object({ label: z.string().max(80).nullable() })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Use a day label of at most 80 characters." }, { status: 400 });
  const { data, error } = await auth.supabase
    .from("trip_days")
    .update({ label: body.data.label || null })
    .eq("id", dayId)
    .eq("itinerary_id", id)
    .select("id")
    .maybeSingle();
  if (error) return mutationError(error);
  if (!data) return NextResponse.json({ error: "Day not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: Request, { params }: Context) {
  const { id, dayId } = await params;
  const auth = await requireTripEditor(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const { error } = await auth.supabase.rpc("delete_trip_day", { target_id: id, target_day_id: dayId });
  if (error) return mutationError(error, "Could not delete this day. Keep at least one day in your trip.");
  return NextResponse.json({ ok: true });
}
