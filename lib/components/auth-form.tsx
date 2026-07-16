"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { getSiteUrl } from "@/lib/env";

type AuthFormProps = {
  mode: "login" | "signup";
  enabled?: boolean;
};

export function AuthForm({ mode, enabled = true }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function getAuthOrigin() {
    if (typeof window !== "undefined" && window.location.origin) {
      return window.location.origin;
    }

    return getSiteUrl();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) {
      setError("Supabase is not configured yet. Add env vars to enable authentication.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${getAuthOrigin()}/dashboard`
          }
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage("Account created. Confirm your email, then log in.");
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (loginError) {
          setError(loginError.message);
        } else {
          const {
            data: { session }
          } = await supabase.auth.getSession();
          if (!session) {
            setError("Login succeeded but session was not created. Please refresh and try again.");
            return;
          }

          window.location.assign("/dashboard");
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected authentication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl bg-white/90 p-6 shadow-md ring-1 ring-[#ffd2e6]"
      style={{ backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)", border: "1px solid #ffd2e6" }}
    >
      <label className="block text-sm font-medium text-slate-800" style={{ display: "block", color: "#1f2937", fontWeight: 600 }}>
        Email
        <input
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          style={{ display: "block", width: "100%", marginTop: 6, borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", padding: "10px 12px" }}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-800" style={{ display: "block", color: "#1f2937", fontWeight: 600 }}>
        <span className="flex items-center justify-between gap-3">
          Password
          {mode === "login" ? (
            <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#ff4f8b] hover:underline">
              Forgot password?
            </Link>
          ) : null}
        </span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          style={{ display: "block", width: "100%", marginTop: 6, borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", padding: "10px 12px" }}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[#ff4f8b]">{message}</p> : null}

      <button
        type="submit"
        disabled={loading || !enabled}
        className="w-full rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0] disabled:opacity-60"
        style={{
          width: "100%",
          borderRadius: 8,
          border: "none",
          padding: "10px 14px",
          fontWeight: 700,
          color: "#fff",
          backgroundImage: "linear-gradient(90deg, #ff6a3d, #ff4f8b)"
        }}
      >
        {!enabled ? "Supabase not configured" : loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
