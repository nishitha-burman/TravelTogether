"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { getSiteUrl } from "@/lib/env";

type ForgotPasswordFormProps = {
  enabled?: boolean;
};

export function ForgotPasswordForm({ enabled = true }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
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
      setError("Password reset is unavailable in this preview.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${getAuthOrigin()}/auth/callback?next=/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage("Check your email for a password reset link.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected password reset error");
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
        {!enabled ? "Preview only" : loading ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-sm text-slate-700">
        Remember your password?{" "}
        <Link href="/auth/login" className="font-semibold text-[var(--accent)] hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
