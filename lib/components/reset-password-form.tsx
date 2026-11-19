"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type ResetPasswordFormProps = {
  enabled?: boolean;
};

export function ResetPasswordForm({ enabled = true }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;

    async function prepareRecoverySession() {
      setError(null);
      const supabase = createSupabaseBrowserClient();

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("Open the reset link from your email before choosing a new password.");
        }

        if (!cancelled) {
          setReady(true);
        }
      } catch (recoveryError) {
        if (!cancelled) {
          setReady(false);
          setError(
            recoveryError instanceof Error ? recoveryError.message : "Unable to verify password reset link",
          );
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) {
      setError("Password reset is unavailable in this preview.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Password updated. Taking you to your dashboard...");
      window.setTimeout(() => window.location.assign("/dashboard"), 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected password update error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4">
      <label className="block text-sm font-medium text-slate-800">
        New password
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          disabled={!ready || loading}
        />
      </label>

      <label className="block text-sm font-medium text-slate-800">
        Confirm new password
        <input
          className="field"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
          disabled={!ready || loading}
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

      <button type="submit" disabled={loading || !enabled || !ready} className="button w-full">
        {!enabled ? "Preview only" : loading ? "Updating..." : "Update password"}
      </button>

      {!ready ? (
        <p className="text-sm text-slate-700">
          Need a new reset email?{" "}
          <Link href="/auth/forgot-password" className="font-semibold text-[var(--accent)] hover:underline">
            Request another link
          </Link>
        </p>
      ) : null}
    </form>
  );
}
