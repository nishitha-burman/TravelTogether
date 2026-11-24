import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export async function requestEmailChange(
  supabase: SupabaseClient,
  email: string,
  current: string | undefined,
  origin: string,
) {
  const parsed = z.email().max(254).safeParse(email.trim());
  if (!parsed.success) throw new Error("Enter a valid email address.");
  if (parsed.data.toLowerCase() === current?.toLowerCase())
    throw new Error("Enter a different email address.");
  const { data, error } = await supabase.auth.updateUser(
    { email: parsed.data },
    {
      emailRedirectTo: new URL("/auth/callback?next=/settings/account", origin)
        .href,
    },
  );
  if (error) throw new Error(error.message);
  return data.user;
}
