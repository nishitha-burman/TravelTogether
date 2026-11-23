"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { requestEmailChange } from "@/lib/account-email";

export function AccountEmailForm({
  email,
  pendingEmail,
  scaffold = false,
  confirmationError = false,
}: {
  email?: string;
  pendingEmail?: string;
  scaffold?: boolean;
  confirmationError?: boolean;
}) {
  const router = useRouter();
  const [nextEmail, setNextEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(
    confirmationError
      ? "The confirmation link could not be completed. Try requesting a new email change."
      : "",
  );
  const locked = useRef(false);
  return (
    <form
      className="space-y-4 border-t border-[var(--line)] pt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (scaffold || locked.current) return;
        locked.current = true;
        setSaving(true);
        setError("");
        setStatus("");
        try {
          const user = await requestEmailChange(
            createSupabaseBrowserClient(),
            nextEmail,
            email,
            window.location.origin,
          );
          setStatus(
            user?.email?.toLowerCase() === nextEmail.trim().toLowerCase()
              ? "Email updated. Use your new email the next time you sign in."
              : "Check your inboxes for confirmation links. Your current email stays active until confirmation is complete.",
          );
          setNextEmail("");
          router.refresh();
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not change your email. Please retry.",
          );
        } finally {
          locked.current = false;
          setSaving(false);
        }
      }}
    >
      <h3 className="font-semibold">Change email address</h3>
      {pendingEmail ? (
        <p className="text-sm muted">
          Awaiting confirmation:{" "}
          <span className="break-all">{pendingEmail}</span>. Follow the links
          sent to your inboxes.
        </p>
      ) : null}
      <label className="field-label">
        New email address
        <input
          className="field"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={nextEmail}
          disabled={saving}
          onChange={(event) => setNextEmail(event.target.value)}
        />
      </label>
      <p className="text-xs leading-relaxed muted">
        This is your sign-in email. Changing it keeps your trips and profile on
        the same account. Follow the confirmation instructions sent by email.
      </p>
      <button
        className="button-secondary"
        disabled={scaffold || saving || !nextEmail.trim()}
      >
        {saving ? "Requesting…" : "Request email change"}
      </button>
      {scaffold ? (
        <p className="status">Email changes are unavailable in this preview.</p>
      ) : null}
      <p role="status" className="status">
        {status}
      </p>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
