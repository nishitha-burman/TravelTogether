"use client";

import { useState } from "react";
import { getAuthJsonHeaders } from "@/lib/client-api";

type SharingSettingsProps = {
  tripId: string;
  isPublic: boolean;
  publicSlug: string;
};

export function SharingSettings({ tripId, isPublic, publicSlug }: SharingSettingsProps) {
  const [publicState, setPublicState] = useState(isPublic);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/public/${publicSlug}`
      : `/public/${publicSlug}`;

  async function toggleVisibility() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/trips/${tripId}/settings`, {
      method: "PATCH",
      headers: await getAuthJsonHeaders(),
      body: JSON.stringify({ isPublic: !publicState })
    });

    setLoading(false);

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Failed to update visibility");
      return;
    }

    setPublicState((value) => !value);
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/trips/${tripId}/members`, {
      method: "POST",
      headers: await getAuthJsonHeaders(),
      body: JSON.stringify({ email: inviteEmail })
    });

    setLoading(false);

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Failed to invite member");
      return;
    }

    setInviteEmail("");
    setCopied(false);
  }

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Sharing</h2>
        <p className="text-sm text-slate-600">Choose private sharing via email or public link mode.</p>
      </div>

      <button
        onClick={toggleVisibility}
        disabled={loading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {publicState ? "Set private" : "Set public"}
      </button>

      {publicState ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            Public link:{" "}
            <a href={publicUrl} className="font-semibold text-brand-600 underline">
              {publicUrl}
            </a>
          </p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl);
              setCopied(true);
            }}
            className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-100"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : (
        <form onSubmit={inviteMember} className="flex flex-wrap gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="friend@email.com"
            className="rounded-md border border-slate-300 px-3 py-2"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            Invite by email
          </button>
        </form>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
