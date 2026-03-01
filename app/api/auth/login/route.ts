import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }

    const body = loginSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
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

    const { error } = await supabase.auth.signInWithPassword({
      email: body.data.email.toLowerCase(),
      password: body.data.password
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
