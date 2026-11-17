import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import { createFetchWithTimeout } from "@/lib/fetch-with-timeout";

const SUPABASE_SERVER_TIMEOUT_MS = 5_000;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  type SetCookie = {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  };

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      fetch: createFetchWithTimeout(SUPABASE_SERVER_TIMEOUT_MS)
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SetCookie[]) {
        try {
          cookiesToSet.forEach((cookie) => {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          });
        } catch {
          // no-op in Server Components that cannot mutate cookies
        }
      }
    }
  });
}
