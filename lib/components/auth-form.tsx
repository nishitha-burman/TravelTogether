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
      setError("Sign-in is unavailable in this preview. Explore a sample trip instead.");
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
            emailRedirectTo: `${getAuthOrigin()}/dashboard`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage("Account created. Confirm your email, then log in.");
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (loginError) {
          setError(loginError.message);
        } else {
          const {
            data: { session },
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
    <form onSubmit={onSubmit} className="panel space-y-4">
      <label className="block text-sm font-medium text-slate-800">
        Email
        <input
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-800">
        <span className="flex items-center justify-between gap-3">
          Password
          {mode === "login" ? (
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </Link>
          ) : null}
        </span>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>

      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-[var(--accent)]">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={loading || !enabled} className="button w-full">
        {!enabled
          ? "Preview only"
          : loading
            ? "Please wait..."
            : mode === "signup"
              ? "Create account"
              : "Log in"}
      </button>
    </form>
  );
}
