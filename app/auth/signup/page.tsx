import Link from "next/link";
import { AuthForm } from "@/lib/components/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function SignupPage() {
  const enabled = isSupabaseConfigured();

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="page-title">Create account</h1>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Preview mode · Sign-in is disabled.
        </p>
      ) : null}
      <AuthForm mode="signup" enabled={enabled} />
      <p className="text-sm text-slate-700">
        Already registered?{" "}
        <Link href="/auth/login" className="text-[var(--accent)] hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
