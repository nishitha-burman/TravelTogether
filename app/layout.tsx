import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";
export const metadata: Metadata = {
  title: "TravelTogether",
  description: "One shared itinerary, from the first idea to your calendar.",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const enabled = isSupabaseConfigured();
  let signedIn = false;
  if (enabled) {
    try {
      const client = await createSupabaseServerClient();
      signedIn = Boolean((await client.auth.getUser()).data.user);
    } catch {}
  }
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
        >
          Skip to content
        </a>
        <header className="border-b border-[var(--line)] bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="leading-tight">
              <span className="block font-serif text-2xl font-semibold tracking-tight">TravelTogether</span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--muted)]">v1.5</span>
            </Link>
            <nav aria-label="Main navigation" className="flex items-center gap-4 text-sm">
              {signedIn || !enabled ? (
                <Link href="/dashboard" className="font-semibold">
                  Your trips
                </Link>
              ) : (
                <Link href="/auth/login">Log in</Link>
              )}
              {signedIn ? (
                <Link href="/profile" className="font-semibold">Profile</Link>
              ) : !enabled ? (
                <Link href="/profile">Profile</Link>
              ) : null}
              {signedIn ? (
                <form action="/auth/logout" method="post">
                  <button className="text-button">Log out</button>
                </form>
              ) : !enabled ? (
                <span className="text-xs muted">Preview</span>
              ) : (
                <Link href="/auth/signup" className="button">
                  Start planning
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl px-5 py-8 text-xs muted sm:px-8">
          TravelTogether · A shared plan for the days ahead.
        </footer>
      </body>
    </html>
  );
}
