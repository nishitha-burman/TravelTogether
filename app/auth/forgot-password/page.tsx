import { ForgotPasswordForm } from "@/lib/components/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  const enabled = isSupabaseConfigured();

  return (
    <section className="mx-auto max-w-md space-y-4" style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
      <h1 className="text-3xl font-bold text-[#ff4f8b]" style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 800, color: "#ff4f8b" }}>
        Reset password
      </h1>
      <p className="text-sm text-slate-700" style={{ fontSize: 18, color: "#334155" }}>
        Enter your email and we will send you a secure link to choose a new password.
      </p>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Scaffold mode: configure Supabase env vars to enable password reset.
        </p>
      ) : null}
      <ForgotPasswordForm enabled={enabled} />
    </section>
  );
}
