import { ResetPasswordForm } from "@/lib/components/reset-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function ResetPasswordPage() {
  const enabled = isSupabaseConfigured();

  return (
    <section className="mx-auto max-w-md space-y-4" style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
      <h1 className="text-3xl font-bold text-[#ff4f8b]" style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 800, color: "#ff4f8b" }}>
        Choose new password
      </h1>
      <p className="text-sm text-slate-700" style={{ fontSize: 18, color: "#334155" }}>
        After opening the reset link from your email, enter a new password for your account.
      </p>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Scaffold mode: configure Supabase env vars to enable password reset.
        </p>
      ) : null}
      <ResetPasswordForm enabled={enabled} />
    </section>
  );
}
