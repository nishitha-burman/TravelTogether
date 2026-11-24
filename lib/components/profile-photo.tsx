"use client";

import { useRef, useState } from "react";
import { getAuthJsonHeaders } from "@/lib/client-api";
import { PROFILE_PHOTO_LIMIT, PROFILE_PHOTO_TYPES } from "@/lib/profile-photo";

export function ProfileAvatar({
  initials,
  version,
  scaffold = false,
}: {
  initials: string;
  version: number;
  scaffold?: boolean;
}) {
  const src = `/api/profile/photo?v=${version}`;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return !scaffold && failedSrc !== src ? (
    // Authenticated images must bypass Next's public image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt="Your profile photo"
      width={80}
      height={80}
      className="h-20 w-20 shrink-0 rounded-full object-cover"
      onError={() => setFailedSrc(src)}
    />
  ) : (
    <span
      aria-label="Profile initials"
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-2xl text-white"
    >
      {initials}
    </span>
  );
}

export function ProfilePhoto({
  scaffold = false,
  onUploaded,
}: {
  scaffold?: boolean;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const locked = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className="space-y-4 border-b border-[var(--line)] pb-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file || scaffold || locked.current) return;
        locked.current = true;
        setSaving(true);
        setError("");
        setStatus("");
        try {
          const body = new FormData();
          body.set("photo", file);
          const headers = await getAuthJsonHeaders();
          headers.delete("Content-Type");
          const response = await fetch("/api/profile/photo", {
            method: "PUT",
            headers,
            body,
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Could not upload your photo.");
          onUploaded();
          setFile(null);
          if (input.current) input.current.value = "";
          setStatus("Photo saved");
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not upload your photo. Please retry.",
          );
        } finally {
          setSaving(false);
          locked.current = false;
        }
      }}
    >
      <label className="field-label">
        Choose profile photo
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={saving}
          className="field min-w-0 max-w-full text-sm"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setStatus("");
            setError("");
            setFile(null);
            if (
              selected &&
              (!PROFILE_PHOTO_TYPES.includes(selected.type) ||
                !selected.size ||
                selected.size > PROFILE_PHOTO_LIMIT)
            ) {
              setError("Choose a JPG, PNG or WebP photo up to 2 MB.");
              event.target.value = "";
            } else setFile(selected);
          }}
        />
      </label>
      <p className="text-xs muted">
        JPG, PNG or WebP, up to 2 MB. Uploads save immediately and update the
        photo above.
      </p>
      <button
        className="button-secondary"
        disabled={scaffold || saving || !file}
      >
        {saving ? "Uploading…" : "Upload photo"}
      </button>
      {scaffold ? (
        <p className="status">Sample profile · Uploads are not saved.</p>
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
