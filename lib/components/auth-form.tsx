"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type AuthFormProps = {
  mode: "login" | "signup";
  enabled?: boolean;
};

export function AuthForm({ mode, enabled = true }: AuthFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) {
      setError("Supabase is not configured yet. Add env vars to enable authentication.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Account created. Confirm your email, then log in.");
      }
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-brand-600">{message}</p> : null}

      <button
        type="submit"
        disabled={loading || !enabled}
        className="w-full rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {!enabled ? "Supabase not configured" : loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
