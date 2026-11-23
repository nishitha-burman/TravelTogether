import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@/types/trip";
import { missingColumn } from "@/lib/server/compatibility";

export async function readProfile(supabase: SupabaseClient, userId: string) {
  const result = await supabase
    .from("profiles")
    .select("id,display_name,home_city,bio,created_at")
    .eq("id", userId)
    .maybeSingle();
  if (missingColumn(result.error)) {
    const fallback = await supabase
      .from("profiles")
      .select("id,created_at")
      .eq("id", userId)
      .maybeSingle();
    if (fallback.error)
      throw new Error("Could not load your profile. Please try again.");
    return {
      profile: fallback.data
        ? ({
            ...fallback.data,
            display_name: null,
            home_city: null,
            bio: null,
          } as ProfileRow)
        : null,
      editable: false,
    };
  }
  if (result.error)
    throw new Error("Could not load your profile. Please try again.");
  return {
    profile: result.data as ProfileRow | null,
    editable: Boolean(result.data),
  };
}
