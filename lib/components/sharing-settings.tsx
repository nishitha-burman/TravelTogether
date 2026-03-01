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
    <section className="space-y-4 rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Sharing</h2>
        <p className="text-sm text-slate-700">Choose private sharing via email or public link mode.</p>
      </div>

      <button
        onClick={toggleVisibility}
        disabled={loading}
        className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0] disabled:opacity-60"
      >
        {publicState ? "Set private" : "Set public"}
      </button>

      {publicState ? (
        <div className="rounded-md border border-[#ffd2e6] bg-[#fff1f7] p-3 text-sm text-slate-800">
          <p>
            Public link:{" "}
            <a href={publicUrl} className="font-semibold text-[#ff4f8b] underline">
              {publicUrl}
            </a>
          </p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl);
              setCopied(true);
            }}
            className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
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
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0] disabled:opacity-60"
          >
            Invite by email
          </button>
        </form>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
