import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/lib/trips";
import { dateLabel } from "@/lib/calendar/time";
import { AccountEmailForm } from "@/lib/components/account-email-form";

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ emailConfirmation?: string }>;
}) {
  const params = await searchParams;
  const scaffold = !isSupabaseConfigured();
  const user = scaffold
    ? {
        email: "traveler@example.com",
        new_email: undefined,
        created_at: "2026-11-16T12:00:00Z",
      }
    : (await requireUser()).user;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/profile"
        className="text-sm muted underline underline-offset-4"
      >
        ← Your profile
      </Link>
      <header className="space-y-2">
        <h1 className="page-title">Account settings</h1>
        <p className="text-sm muted">
          Your private sign-in details. Your email and account history aren’t
          shown on your traveler profile.
        </p>
      </header>
      {scaffold ? (
        <p className="status">Sample account · Changes are not saved.</p>
      ) : null}
      <section className="panel space-y-6" aria-labelledby="account-details">
        <h2 id="account-details" className="section-heading">
          Account details
        </h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="muted">Email address</dt>
            <dd className="mt-1 break-all">{user.email ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="muted">Member since</dt>
            <dd className="mt-1">{dateLabel(user.created_at.slice(0, 10))}</dd>
          </div>
        </dl>
        <AccountEmailForm
          email={user.email}
          pendingEmail={user.new_email}
          scaffold={scaffold}
          confirmationError={params.emailConfirmation === "error"}
        />
      </section>
    </div>
  );
}
