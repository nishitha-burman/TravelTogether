import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { profileSchema } from "@/lib/schemas";
import { missingColumn } from "@/lib/server/compatibility";

export async function PATCH(request: Request) {
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user || !auth.supabase) return auth.error;
  const parsed = profileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check your profile details and field lengths." },
      { status: 400 },
    );
  const fields: {
    display_name?: string | null;
    home_city?: string | null;
    bio?: string | null;
  } = {};
  if (parsed.data.displayName !== undefined)
    fields.display_name = parsed.data.displayName || null;
  if (parsed.data.homeCity !== undefined)
    fields.home_city = parsed.data.homeCity || null;
  if (parsed.data.bio !== undefined) fields.bio = parsed.data.bio || null;
  const { data, error } = await auth.supabase
    .from("profiles")
    .update(fields)
    .eq("id", auth.user.id)
    .select("id")
    .maybeSingle();
  if (missingColumn(error))
    return NextResponse.json(
      {
        error:
          "Profile editing is temporarily unavailable. Your trips are still available.",
        code: "UPGRADE_REQUIRED",
      },
      { status: 503 },
    );
  if (error)
    return NextResponse.json(
      { error: "Could not save your profile. Please retry." },
      { status: 400 },
    );
  if (!data)
    return NextResponse.json(
      { error: "Your profile is unavailable. Please try again later." },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
