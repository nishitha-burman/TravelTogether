import { canEditContent, type TripRole } from "@/lib/permissions";
import type { SupabaseClient } from "@supabase/supabase-js";
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
      user: null,
    };
  }

  const accessToken = getBearerToken(request);
  if (accessToken) {
    const env = getSupabaseEnv();
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        supabase,
        user: null,
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
      user: null,
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
      error: NextResponse.json({ error: "Only trip owner can modify this resource" }, { status: 403 }),
    };
  }

  return auth;
}

// Explicit membership check also protects deployments whose legacy RLS includes public trips.
export async function getTripRole(
  supabase: SupabaseClient,
  itineraryId: string,
  userId: string,
): Promise<TripRole | null> {
  const { data: trip } = await supabase
    .from("itineraries")
    .select("owner_id")
    .eq("id", itineraryId)
    .maybeSingle();
  if (!trip) return null;
  if (trip.owner_id === userId) return "owner";
  const { data: member } = await supabase
    .from("itinerary_members")
    .select("role")
    .eq("itinerary_id", itineraryId)
    .eq("user_id", userId)
    .maybeSingle();
  return member?.role === "editor" || member?.role === "viewer" ? member.role : null;
}
export async function requireTripAccess(itineraryId: string, request?: Request, edit = false) {
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user || !auth.supabase) return { ...auth, role: null };
  const role = await getTripRole(auth.supabase, itineraryId, auth.user.id);
  if (!role || (edit && !canEditContent(role)))
    return {
      ...auth,
      role,
      error: NextResponse.json(
        {
          error: edit
            ? "You need editing access to change this trip."
            : "You do not have access to this trip.",
        },
        { status: 403 },
      ),
    };
  return { ...auth, role };
}
export const requireTripEditor = (id: string, request?: Request) => requireTripAccess(id, request, true);
