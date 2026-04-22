import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import "./globals.css";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "TravelTogether",
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
        try {
          const supabase = await createSupabaseServerClient();
          return supabase.auth.getUser().then((result) => result.data);
        } catch {
          return { user: null };
        }
      })()
    : { user: null };

  return (
    <html lang="en">
      <body
        className="min-h-screen"
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 12% 18%, rgba(255, 77, 166, 0.22) 0%, rgba(255, 77, 166, 0) 36%), radial-gradient(circle at 85% 14%, rgba(31, 182, 217, 0.24) 0%, rgba(31, 182, 217, 0) 38%), radial-gradient(circle at 18% 86%, rgba(255, 153, 51, 0.2) 0%, rgba(255, 153, 51, 0) 42%), linear-gradient(160deg, #ecfeff 0%, #fdf2f8 48%, #fff7ed 100%)",
          color: "#0a2f4d"
        }}
      >
        <header
          className="border-b border-[#ffd2e6] bg-white/75 backdrop-blur"
          style={{ borderBottom: "1px solid #ffd2e6", backgroundColor: "rgba(255,255,255,0.75)" }}
        >
          <div
            className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
            style={{ maxWidth: 1152, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px 20px" }}
          >
            <Link
              href="/"
              className="bg-gradient-to-r from-[#ff6a3d] via-[#ff4f8b] to-[#ffb347] bg-clip-text text-xl font-bold text-transparent"
              style={{
                display: "inline-block",
                fontSize: 34,
                lineHeight: 1.25,
                fontWeight: 700,
                padding: "2px 0 6px",
                overflow: "visible",
                textDecoration: "none",
                backgroundImage: "linear-gradient(90deg, #ff6a3d, #ff4f8b, #ffb347)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent"
              }}
            >
              TravelTogether
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-800" style={{ display: "flex", alignItems: "center", gap: 16, fontWeight: 600 }}>
              {data.user ? (
                <>
                  <Link href="/dashboard" className="hover:text-[#ff4f8b]" style={{ color: "#1f2937", textDecoration: "none" }}>
                    Dashboard
                  </Link>
                  <form action="/auth/logout" method="post">
                    <button
                      className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-3 py-2 text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0]"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 8,
                        border: "none",
                        padding: "8px 12px",
                        color: "#fff",
                        backgroundImage: "linear-gradient(90deg, #ff6a3d, #ff4f8b)"
                      }}
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {!supabaseEnabled ? <span className="text-xs text-amber-700">Scaffold mode (no Supabase)</span> : null}
                  <Link href="/auth/login" className="hover:text-[#ff4f8b]" style={{ color: "#1f2937", textDecoration: "none" }}>
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-3 py-2 text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0]"
                    style={{
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#fff",
                      textDecoration: "none",
                      backgroundImage: "linear-gradient(90deg, #ff6a3d, #ff4f8b)"
                    }}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8" style={{ maxWidth: 1152, margin: "0 auto", padding: "32px 24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
