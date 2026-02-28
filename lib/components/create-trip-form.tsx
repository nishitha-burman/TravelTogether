"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { getAuthJsonHeaders } from "@/lib/client-api";

type CreateTripFormProps = {
  enabled?: boolean;
};

export function CreateTripForm({ enabled = true }: CreateTripFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [tripLengthDays, setTripLengthDays] = useState(5);
  const [isPublic, setIsPublic] = useState(false);
  const [themeImageUrl, setThemeImageUrl] = useState("");
  const [themeFile, setThemeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function uploadThemeImageIfNeeded() {
    if (!themeFile) return themeImageUrl || null;
    const supabase = createSupabaseBrowserClient();

    const ext = themeFile.name.split(".").pop() || "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("trip-images").upload(fileName, themeFile, {
      cacheControl: "3600",
      upsert: false
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("trip-images").getPublicUrl(fileName);

    return publicUrl;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) {
      setError("Supabase is not configured yet. This is scaffold-only mode.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const finalThemeImageUrl = await uploadThemeImageIfNeeded();

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: await getAuthJsonHeaders(),
        body: JSON.stringify({
          title,
          destination,
          tripLengthDays,
          isPublic,
          themeImageUrl: finalThemeImageUrl
        })
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Failed to create trip");
      }

      const body = await response.json();
      router.push(`/trips/${body.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <label className="block text-sm font-medium text-slate-700">
        Trip title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Summer in Lisbon"
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Destination
        <input
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Lisbon, Portugal"
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Trip length (days)
        <input
          type="number"
          min={1}
          max={60}
          value={tripLengthDays}
          onChange={(event) => setTripLengthDays(Number(event.target.value))}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Theme image URL (optional)
        <input
          type="url"
          value={themeImageUrl}
          onChange={(event) => setThemeImageUrl(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="https://..."
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Or upload theme image (optional)
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setThemeFile(event.target.files?.[0] ?? null)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="h-4 w-4"
        />
        Public itinerary (anyone with link can view)
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || !enabled}
        className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {!enabled ? "Supabase not configured" : loading ? "Creating..." : "Create itinerary"}
      </button>
    </form>
  );
}
