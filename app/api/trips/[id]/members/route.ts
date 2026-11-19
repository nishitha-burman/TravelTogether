import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripOwner } from "@/lib/api-auth";
import { mutationError } from "@/lib/api-response";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const { data, error } = await auth.supabase.rpc("trip_collaborators", { target_id: id });
  if (error) return mutationError(error, "Could not load travelers. Please retry.");
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.user || !auth.supabase) return auth.error;
  const body = z
    .object({ email: z.string().trim().email(), role: z.enum(["editor", "viewer"]) })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Choose a role and enter a valid email." }, { status: 400 });
  const { error } = await auth.supabase
    .from("itinerary_invites")
    .insert({
      itinerary_id: id,
      invited_email: body.data.email.toLowerCase(),
      invited_by: auth.user.id,
      role: body.data.role,
    });
  if (error) return mutationError(error, "Could not invite this traveler. Please retry.");
  return NextResponse.json({ ok: true }, { status: 201 });
}
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const body = z
    .object({ userId: z.string().uuid(), role: z.enum(["editor", "viewer"]) })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Choose a valid traveler and role." }, { status: 400 });
  const { error } = await auth.supabase
    .from("itinerary_members")
    .update({ role: body.data.role })
    .eq("itinerary_id", id)
    .eq("user_id", body.data.userId);
  if (error) return mutationError(error);
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const auth = await requireTripOwner(id, request);
  if (auth.error || !auth.supabase) return auth.error;
  const body = z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("invite"), id: z.string().uuid() }).strict(),
      z.object({ kind: z.literal("member"), id: z.string().uuid() }).strict(),
    ])
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a traveler or invitation." }, { status: 400 });
  const invite = body.data.kind === "invite";
  const { error } = await auth.supabase
    .from(invite ? "itinerary_invites" : "itinerary_members")
    .delete()
    .eq("itinerary_id", id)
    .eq(invite ? "id" : "user_id", body.data.id);
  if (error) return mutationError(error);
  return NextResponse.json({ ok: true });
}
