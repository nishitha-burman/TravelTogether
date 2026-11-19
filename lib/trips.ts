import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";
export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/auth/login");
  return { supabase, user: data.user };
}
export async function acceptPendingInvitesByEmail() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("accept_pending_invites");
  return error ? "Invitations could not be checked. Refresh to try again." : null;
}
