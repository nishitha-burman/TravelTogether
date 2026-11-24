import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") || "/dashboard";
  // Keep previously sent email-confirmation links working after moving settings.
  const next =
    requestedNext === "/profile" ? "/settings/account" : requestedNext;
  const redirectUrl = new URL(
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
    requestUrl.origin,
  );
  if (redirectUrl.origin !== requestUrl.origin)
    redirectUrl.href = new URL("/dashboard", requestUrl.origin).href;
  const response = NextResponse.redirect(redirectUrl);

  if (!isSupabaseConfigured() || !code) {
    if (next === "/settings/account" && !code)
      return NextResponse.redirect(
        new URL("/settings/account?emailConfirmation=error", requestUrl.origin),
      );
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
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    response.headers.set(
      "Location",
      new URL(
        next === "/settings/account"
          ? "/settings/account?emailConfirmation=error"
          : "/auth/login",
        requestUrl.origin,
      ).href,
    );
  }

  return response;
}
