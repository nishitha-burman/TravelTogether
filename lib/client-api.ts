"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export async function getAuthJsonHeaders() {
  const headers = new Headers({ "Content-Type": "application/json" });
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return headers;
}
