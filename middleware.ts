import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createFetchWithTimeout } from "@/lib/fetch-with-timeout";

const SUPABASE_MIDDLEWARE_TIMEOUT_MS = 3_000;

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") && (name.endsWith("-auth-token") || /-auth-token\.\d+$/.test(name)),
    );
}

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  // Anonymous requests do not have a session to refresh. Avoid an unnecessary
  // network dependency in middleware so public pages remain available even if
  // Supabase is temporarily unreachable.
  if (!hasSupabaseSessionCookie(request)) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  type SetCookie = {
    name: string;
    value: string;
    options?: Parameters<typeof response.cookies.set>[2];
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: createFetchWithTimeout(SUPABASE_MIDDLEWARE_TIMEOUT_MS),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SetCookie[]) {
          cookiesToSet.forEach((cookie) => {
            request.cookies.set(cookie.name, cookie.value);
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          });
        },
      },
    },
  );

  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error(
      "Supabase session refresh failed in middleware",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
