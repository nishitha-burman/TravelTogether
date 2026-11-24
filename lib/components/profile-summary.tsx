"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { ProfileRow } from "@/types/trip";
import { ProfileForm } from "@/lib/components/profile-form";
import { ProfileAvatar, ProfilePhoto } from "@/lib/components/profile-photo";

export function ProfileSummary({
  profile,
  enabled,
  scaffold,
}: {
  profile: ProfileRow;
  enabled: boolean;
  scaffold: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const editButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const name = profile.display_name || "Traveler";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  function close() {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }
  return (
    <section className="space-y-6" aria-label="Your profile">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <ProfileAvatar
            initials={initials}
            version={photoVersion}
            scaffold={scaffold}
          />
          <div className="min-w-0 space-y-2">
            <p className="eyebrow">Your profile</p>
            <h1 className="page-title break-words">{name}</h1>
            {profile.home_city ? (
              <p className="text-sm muted">Based in {profile.home_city}</p>
            ) : null}
            {profile.bio ? (
              <p className="max-w-xl whitespace-pre-wrap break-words text-sm">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            ref={editButton}
            className="button"
            aria-expanded={editing}
            aria-controls={panelId}
            onClick={() => (editing ? close() : setEditing(true))}
          >
            Edit profile
          </button>
          <Link href="/settings/account" className="button-secondary">
            Account settings
          </Link>
          <Link href="/dashboard" className="button-secondary">
            Your trips →
          </Link>
        </div>
      </header>
      {editing ? (
        <section
          id={panelId}
          aria-label="Edit profile"
          className="panel space-y-6"
        >
          <h2 className="section-heading">Edit profile</h2>
          <ProfilePhoto
            scaffold={scaffold}
            onUploaded={() => setPhotoVersion((version) => version + 1)}
          />
          <ProfileForm
            profile={profile}
            enabled={enabled}
            scaffold={scaffold}
            onSaved={close}
            onCancel={close}
          />
          <p className="text-xs muted">
            Your profile details and photo are visible only to you. They aren’t
            shared in public itineraries or calendar downloads.
          </p>
        </section>
      ) : null}
    </section>
  );
}
