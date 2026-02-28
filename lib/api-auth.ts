import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function getBearerToken(request?: Request) {
  const header = request?.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice(7).trim() || null;
}

export async function getAuthedUser(request?: Request) {
  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }),
      supabase: null,
      user: null
    };
  }

  const accessToken = getBearerToken(request);
  if (accessToken) {
    const env = getSupabaseEnv();
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        supabase,
        user: null
      };
    }

    return { error: null, supabase, user: data.user };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabase,
      user: null
    };
  }

  return { error: null, supabase, user: data.user };
}

export async function requireTripOwner(itineraryId: string, request?: Request) {
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user) {
    return auth;
  }

  const { data: trip, error } = await auth.supabase
    .from("itineraries")
    .select("id")
    .eq("id", itineraryId)
    .eq("owner_id", auth.user.id)
    .single();

  if (error || !trip) {
    return {
      ...auth,
      error: NextResponse.json({ error: "Only trip owner can modify this resource" }, { status: 403 })
    };
  }

  return auth;
}
