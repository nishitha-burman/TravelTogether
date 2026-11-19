import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripEditor } from "@/lib/api-auth";
import { timezoneSchema } from "@/lib/schemas";
import { mutationError } from "@/lib/api-response";
const schema = z.object({ startDate: z.string().date(), timezone: timezoneSchema }).strict();
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripEditor(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success)
    return NextResponse.json({ error: "Choose a valid start date and timezone." }, { status: 400 });
  const { error } = await auth.supabase.rpc("assign_trip_dates", {
    target_id: id,
    first_date: payload.data.startDate,
    trip_timezone: payload.data.timezone,
  });
  if (error)
    return mutationError(error, "Could not assign dates. Keep at least one day and check the timezone.");
  return NextResponse.json({ ok: true });
}
