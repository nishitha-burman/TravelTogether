import { ForgotPasswordForm } from "@/lib/components/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  const enabled = isSupabaseConfigured();

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="page-title">Reset password</h1>
      <p className="text-sm text-slate-700">
        Enter your email and we will send you a secure link to choose a new password.
      </p>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Password reset is unavailable in this preview.
        </p>
      ) : null}
      <ForgotPasswordForm enabled={enabled} />
    </section>
  );
}
