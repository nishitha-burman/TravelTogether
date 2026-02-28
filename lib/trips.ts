import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth/login");
  }

  return { supabase, user: data.user };
}

export async function acceptPendingInvitesByEmail(userEmail: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  const { data: inviteRows, error: invitesError } = await supabase
    .from("itinerary_invites")
    .select("id, itinerary_id")
    .eq("invited_email", userEmail.toLowerCase())
    .is("accepted_at", null);

  if (invitesError || !inviteRows || inviteRows.length === 0) {
    return;
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return;

  for (const invite of inviteRows) {
    await supabase.from("itinerary_members").upsert(
      {
        itinerary_id: invite.itinerary_id,
        user_id: userId,
        role: "viewer"
      },
      { onConflict: "itinerary_id,user_id", ignoreDuplicates: true }
    );

    await supabase
      .from("itinerary_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
  }
}
