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
          error: sessionError
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
          setError(recoveryError instanceof Error ? recoveryError.message : "Unable to verify password reset link");
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
      setError("Supabase is not configured yet. Add env vars to enable password reset.");
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
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl bg-white/90 p-6 shadow-md ring-1 ring-[#ffd2e6]"
      style={{
        backgroundColor: "rgba(255,255,255,0.9)",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        border: "1px solid #ffd2e6"
      }}
    >
      <label className="block text-sm font-medium text-slate-800" style={{ display: "block", color: "#1f2937", fontWeight: 600 }}>
        New password
        <input
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            backgroundColor: "#f8fafc",
            padding: "10px 12px"
          }}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          disabled={!ready || loading}
        />
      </label>

      <label className="block text-sm font-medium text-slate-800" style={{ display: "block", color: "#1f2937", fontWeight: 600 }}>
        Confirm new password
        <input
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            backgroundColor: "#f8fafc",
            padding: "10px 12px"
          }}
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
          disabled={!ready || loading}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[#ff4f8b]">{message}</p> : null}

      <button
        type="submit"
        disabled={loading || !enabled || !ready}
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
        {!enabled ? "Supabase not configured" : loading ? "Updating..." : "Update password"}
      </button>

      {!ready ? (
        <p className="text-sm text-slate-700">
          Need a new reset email?{" "}
          <Link href="/auth/forgot-password" className="font-semibold text-[#ff4f8b] hover:underline">
            Request another link
          </Link>
        </p>
      ) : null}
    </form>
  );
}
