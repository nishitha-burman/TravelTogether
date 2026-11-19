import Link from "next/link";
import { AuthForm } from "@/lib/components/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const enabled = isSupabaseConfigured();

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="page-title">Log in</h1>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Preview mode · Sign-in is disabled.
        </p>
      ) : null}
      <AuthForm mode="login" enabled={enabled} />
      <p className="text-sm text-slate-700">
        No account yet?{" "}
        <Link href="/auth/signup" className="text-[var(--accent)] hover:underline">
          Sign up
        </Link>
      </p>
    </section>
  );
}
