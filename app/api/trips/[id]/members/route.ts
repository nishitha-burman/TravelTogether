import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripOwner } from "@/lib/api-auth";

const inviteSchema = z.object({ email: z.string().email() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const payload = inviteSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const email = payload.data.email.toLowerCase();

  const { data: profiles } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profiles?.id) {
    await auth.supabase.from("itinerary_members").upsert(
      {
        itinerary_id: id,
        user_id: profiles.id,
        role: "viewer"
      },
      { onConflict: "itinerary_id,user_id" }
    );
  }

  const { error } = await auth.supabase.from("itinerary_invites").insert({
    itinerary_id: id,
    invited_email: email,
    invited_by: auth.user.id
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
