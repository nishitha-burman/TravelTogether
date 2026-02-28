import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import "./globals.css";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "TripTogether",
  description: "Collaborative travel itinerary planning with friends"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseEnabled = isSupabaseConfigured();
  const data = supabaseEnabled
    ? await (async () => {
        const supabase = await createSupabaseServerClient();
        return supabase.auth.getUser().then((result) => result.data);
      })()
    : { user: null };

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold text-brand-900">
              TripTogether
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
              {data.user ? (
                <>
                  <Link href="/dashboard" className="hover:text-slate-900">
                    Dashboard
                  </Link>
                  <form action="/auth/logout" method="post">
                    <button className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-white hover:bg-slate-700">
                      <LogOut size={14} />
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {!supabaseEnabled ? <span className="text-xs text-amber-700">Scaffold mode (no Supabase)</span> : null}
                  <Link href="/auth/login" className="hover:text-slate-900">
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="rounded-md bg-brand-600 px-3 py-2 text-white hover:bg-brand-500"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
