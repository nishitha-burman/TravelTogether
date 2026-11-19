import { ResetPasswordForm } from "@/lib/components/reset-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function ResetPasswordPage() {
  const enabled = isSupabaseConfigured();

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="page-title">Choose new password</h1>
      <p className="text-sm text-slate-700">
        After opening the reset link from your email, enter a new password for your account.
      </p>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Password reset is unavailable in this preview.
        </p>
      ) : null}
      <ResetPasswordForm enabled={enabled} />
    </section>
  );
}
