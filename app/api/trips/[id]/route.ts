import { NextResponse } from "next/server";
import { requireTripOwner } from "@/lib/api-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
