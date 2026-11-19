import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripOwner } from "@/lib/api-auth";

const settingsSchema = z.object({ isPublic: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const payload = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("itineraries")
    .update({ is_public: payload.data.isPublic })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not save this change. Please retry." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
