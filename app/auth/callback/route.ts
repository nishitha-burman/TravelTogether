import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const redirectUrl = new URL(next.startsWith("/") ? next : "/dashboard", requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  if (!isSupabaseConfigured() || !code) {
    return response;
  }

  const env = getSupabaseEnv();
  type SetCookie = {
    name: string;
    value: string;
    options?: Parameters<typeof response.cookies.set>[2];
  };

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: SetCookie[]) {
        cookiesToSet.forEach((cookie) => {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        });
      }
    }
  });

  await supabase.auth.exchangeCodeForSession(code);

  return response;
}
