"use client";

import { useId, useState } from "react";
import type { ProfileRow } from "@/types/trip";
import { useTripMutation } from "@/lib/components/use-trip-mutation";

export function ProfileForm({
  profile,
  enabled,
  scaffold = false,
}: {
  profile: ProfileRow;
  enabled: boolean;
  scaffold?: boolean;
}) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [city, setCity] = useState(profile.home_city ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const bioCountId = useId();
  const { mutate, saving, error, status } = useTripMutation();
  return (
    <form
      className="panel space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (enabled && !scaffold && !saving)
          void mutate("/api/profile", "PATCH", {
            displayName: name,
            homeCity: city,
            bio,
          });
      }}
    >
      <h2 className="section-heading">About you</h2>
      <fieldset disabled={saving || !enabled} className="space-y-5">
        <label className="field-label">
          Display name
          <input
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            autoComplete="nickname"
            placeholder="What should we call you?"
          />
        </label>
        <label className="field-label">
          Home city
          <input
            className="field"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            maxLength={120}
            autoComplete="address-level2"
            placeholder="Where you usually set off from"
          />
        </label>
        <label className="field-label">
          A little about you
          <textarea
            className="field min-h-28 resize-y"
            aria-describedby={bioCountId}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={500}
            placeholder="Favorite ways to travel, places you love, or what you’re planning next…"
          />
        </label>
        <p id={bioCountId} className="text-xs muted">{bio.length}/500 characters</p>
        <p className="text-sm muted">
          Your profile is private to your account. It isn’t included in public
          itineraries or calendar downloads.
        </p>
        <button className="button" disabled={scaffold || !enabled || saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </fieldset>
      {scaffold ? (
        <p className="status">Sample profile · Changes are not saved.</p>
      ) : !enabled ? (
        <p className="status">
          Profile editing is temporarily unavailable. Your trips are still
          available.
        </p>
      ) : null}
      <p className="status" role="status">
        {status}
      </p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
