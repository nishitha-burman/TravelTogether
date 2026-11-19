import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripEditor } from "@/lib/api-auth";
import { mutationError } from "@/lib/api-response";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripEditor(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const body = z
    .object({ label: z.string().max(80).optional() })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Use a day label of at most 80 characters." }, { status: 400 });
  const { data, error } = await auth.supabase.rpc("append_trip_day", {
    target_id: id,
    day_label: body.data.label || null,
  });
  if (error) return mutationError(error, "Could not add a day. Trips can have up to 120 days.");
  return NextResponse.json({ id: data }, { status: 201 });
}
