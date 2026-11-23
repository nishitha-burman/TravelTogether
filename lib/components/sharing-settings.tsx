"use client";
import { useEffect, useState } from "react";
import { getAuthJsonHeaders } from "@/lib/client-api";
import { useTripMutation } from "@/lib/components/use-trip-mutation";
type Person = { user_id: string; email: string; role: "editor" | "viewer" };
type Invite = { id: string; email: string; role: "editor" | "viewer" };
export function SharingSettings({
  tripId,
  isPublic,
  publicSlug,
  scaffold = false,
  initiallyOpen = false,
}: {
  tripId: string;
  isPublic: boolean;
  publicSlug: string;
  scaffold?: boolean;
  initiallyOpen?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [people, setPeople] = useState<Person[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(scaffold);
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(initiallyOpen);
  const [reload, setReload] = useState(0);
  const { mutate, saving, error, status } = useTripMutation();
  useEffect(() => {
    if (!opened || scaffold) return;
    const controller = new AbortController();
    setLoadError(null);
    setLoaded(false);
    void (async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/members`, {
          headers: await getAuthJsonHeaders(),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load travelers.");
        setPeople(data.members);
        setInvites(data.invites);
        setLoaded(true);
      } catch (e) {
        if (!controller.signal.aborted)
          setLoadError(e instanceof Error ? e.message : "Could not load travelers.");
      }
    })();
    return () => controller.abort();
  }, [opened, tripId, reload, scaffold]);
  const refresh = () => setReload((n) => n + 1);
  return (
    <details id="sharing" className="panel" open={opened} onToggle={(e) => setOpened(e.currentTarget.open)}>
      <summary className="font-semibold">
        Travelers & sharing{" "}
        <span className="font-normal muted">· {isPublic ? "Public link on" : "Private trip"}</span>
      </summary>
      <div className="mt-5 space-y-6">
        <p className="text-sm muted">
          You own this trip. Editors can change the itinerary and dates. Viewers can read the group plan and
          download its calendar. Only you manage access.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(`/api/trips/${tripId}/members`, "POST", { email, role }, () => {
              setEmail("");
              refresh();
            });
          }}
        >
          <label className="field-label">
            Traveler’s email
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field-label">
            Access
            <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <button className="button" disabled={saving || scaffold}>
            Invite traveler
          </button>
        </form>
        <p className="text-xs muted">
          The invitation appears when they sign in with this email and open Your trips. No invitation email is
          sent.
        </p>
        {loadError ? (
          <div className="error" role="alert">
            {loadError}{" "}
            <button className="text-button" onClick={refresh}>
              Retry
            </button>
          </div>
        ) : !loaded ? (
          <p className="status">Loading travelers…</p>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold">Travelers</h3>
              {!people.length ? (
                <p className="mt-2 text-sm muted">It’s just you so far.</p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {people.map((p) => (
                    <li key={p.user_id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="mr-auto break-all text-sm">{p.email}</span>
                      <select
                        aria-label={`Access for ${p.email}`}
                        className="field mt-0 w-auto"
                        value={p.role}
                        disabled={saving}
                        onChange={(e) =>
                          void mutate(
                            `/api/trips/${tripId}/members`,
                            "PATCH",
                            { userId: p.user_id, role: e.target.value },
                            refresh,
                          )
                        }
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        className="text-button text-red-800"
                        disabled={saving}
                        onClick={() => {
                          if (window.confirm(`Remove ${p.email} from this trip?`))
                            void mutate(
                              `/api/trips/${tripId}/members`,
                              "DELETE",
                              { kind: "member", id: p.user_id },
                              refresh,
                            );
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Pending invitations</h3>
              {!invites.length ? (
                <p className="mt-2 text-sm muted">No pending invitations.</p>
              ) : (
                <ul>
                  {invites.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                      <span className="mr-auto break-all">
                        {i.email} · {i.role}
                      </span>
                      <button
                        className="text-button"
                        disabled={saving}
                        onClick={() =>
                          void mutate(
                            `/api/trips/${tripId}/members`,
                            "DELETE",
                            { kind: "invite", id: i.id },
                            refresh,
                          )
                        }
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="space-y-3 border-t border-[var(--line)] pt-5">
          <h3 className="font-semibold">Public itinerary</h3>
          <p className="text-sm muted">
            Anyone with the link can see the title, cover image, day labels, event names and times, and saved
            places. Group notes, booking details and traveler identities stay private.
          </p>
          <button
            className="button-secondary"
            disabled={saving || scaffold}
            onClick={() => {
              if (isPublic || window.confirm("Make this itinerary visible to anyone with its link?"))
                void mutate(`/api/trips/${tripId}/settings`, "PATCH", { isPublic: !isPublic });
            }}
          >
            {isPublic ? "Turn off public link" : "Turn on public link"}
          </button>
          {isPublic ? (
            <div className="flex flex-wrap gap-3">
              <a className="text-button" href={`/public/${publicSlug}`}>
                View public itinerary
              </a>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/public/${publicSlug}`);
                    setCopied(true);
                  } catch {
                    setLoadError("Could not copy. Open the public itinerary and copy its address.");
                  }
                }}
              >
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
          ) : null}
        </div>
        {scaffold ? <p className="status">Sharing is disabled in this sample trip.</p> : null}
        <p role="status" className="status">
          {status}
        </p>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
      </div>
    </details>
  );
}
