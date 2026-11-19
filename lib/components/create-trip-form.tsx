"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { TimezoneField, suggestedTimezone } from "@/lib/components/timezone-field";
import { getAuthJsonHeaders } from "@/lib/client-api";

type CreateTripFormProps = {
  enabled?: boolean;
};

type DestinationSuggestion = {
  id: string;
  location: string;
  country: string;
  label: string;
};

export function CreateTripForm({ enabled = true }: CreateTripFormProps) {
  const router = useRouter();

  const [timezone, setTimezone] = useState("");
  const uploadedPath = useRef<string | null>(null);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [planningMode, setPlanningMode] = useState<"days" | "date_range">("days");
  const [tripLengthDays, setTripLengthDays] = useState(5);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [themeImageUrl, setThemeImageUrl] = useState("");
  const [themeFile, setThemeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const skipNextLookupRef = useRef(false);

  useEffect(() => {
    if (skipNextLookupRef.current) {
      skipNextLookupRef.current = false;
      return;
    }

    const query = city.trim();
    if (query.length < 1) {
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
      setDestinationLoading(false);
      return;
    }

    const controller = new AbortController();
    setDestinationLoading(true);
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error("Failed to fetch destinations");
          }

          const body = (await response.json()) as { suggestions?: DestinationSuggestion[] };
          const suggestions = body.suggestions ?? [];
          setDestinationSuggestions(suggestions);
          setShowDestinationSuggestions(suggestions.length > 0);
        } catch {
          if (!controller.signal.aborted) {
            setDestinationSuggestions([]);
            setShowDestinationSuggestions(false);
          }
        } finally {
          if (!controller.signal.aborted) {
            setDestinationLoading(false);
          }
        }
      })();
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [city]);

  async function uploadThemeImageIfNeeded() {
    if (!themeFile) return themeImageUrl || null;
    const supabase = createSupabaseBrowserClient();

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(themeFile.type) ||
      themeFile.size > 5 * 1024 * 1024
    )
      throw new Error("Choose a JPG, PNG or WebP image under 5 MB.");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in again to upload a cover image.");
    const ext = themeFile.type === "image/jpeg" ? "jpg" : themeFile.type === "image/png" ? "png" : "webp";
    const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("trip-images").upload(fileName, themeFile, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    uploadedPath.current = fileName;
    const {
      data: { publicUrl },
    } = supabase.storage.from("trip-images").getPublicUrl(fileName);

    return publicUrl;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) {
      setError("This is a sample planning form. Your changes aren’t saved.");
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
          timezone: timezone || null,
          city,
          planningMode,
          tripLengthDays: planningMode === "days" ? tripLengthDays : undefined,
          startDate: planningMode === "date_range" ? startDate : undefined,
          endDate: planningMode === "date_range" ? endDate : undefined,
          isPublic,
          themeImageUrl: finalThemeImageUrl,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        if (uploadedPath.current) {
          const client = createSupabaseBrowserClient();
          await client.storage.from("trip-images").remove([uploadedPath.current]);
          uploadedPath.current = null;
        }
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
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block text-sm font-medium text-slate-800">
        Trip title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="field"
          placeholder="Summer in Lisbon"
          required
        />
      </label>

      <div className="relative">
        <label className="block text-sm font-medium text-slate-800">
          Destination
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            onFocus={() => {
              if (destinationSuggestions.length > 0) {
                setShowDestinationSuggestions(true);
              }
            }}
            onBlur={() => {
              // Keep the result buttons reachable by keyboard.
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowDestinationSuggestions(false);
            }}
            autoComplete="off"
            className="field"
            placeholder="Lisbon, Portugal"
            required
          />
        </label>

        {showDestinationSuggestions ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-[var(--line)] bg-white shadow-lg">
            <ul className="max-h-64 overflow-y-auto py-1" aria-label="Destination suggestions">
              {destinationSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left transition hover:bg-[#edf0e9]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      skipNextLookupRef.current = true;
                      setCity(suggestion.label);
                      if (!timezone) setTimezone(suggestedTimezone(suggestion.location) ?? "");
                      setShowDestinationSuggestions(false);
                      setDestinationSuggestions([]);
                    }}
                  >
                    <span className="block font-medium text-slate-900">{suggestion.location}</span>
                    <span className="block text-sm text-slate-700">{suggestion.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {destinationLoading ? (
          <p className="mt-1 text-xs text-slate-700">Looking up destinations...</p>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">When are you going?</legend>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="planningMode"
            value="days"
            checked={planningMode === "days"}
            onChange={() => setPlanningMode("days")}
            className="h-4 w-4 accent-[#263c35]"
          />
          Dates are still open
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="planningMode"
            value="date_range"
            checked={planningMode === "date_range"}
            onChange={() => setPlanningMode("date_range")}
            className="h-4 w-4 accent-[#263c35]"
          />
          I know the dates
        </label>
      </fieldset>

      {planningMode === "days" ? (
        <label className="block text-sm font-medium text-slate-800">
          Trip length (days)
          <input
            type="number"
            min={1}
            max={60}
            value={tripLengthDays}
            onChange={(event) => setTripLengthDays(Number(event.target.value))}
            className="field"
            required
          />
        </label>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="field"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="field"
              required
            />
          </label>
        </div>
      )}

      <TimezoneField value={timezone} onChange={setTimezone} />
      <p className="text-xs muted">
        Choose your destination’s timezone now, or leave it open until the calendar is ready.
      </p>
      <details className="border-t border-[var(--line)] pt-4">
        <summary className="text-sm font-semibold">Cover image (optional)</summary>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-800">
            Image URL
            <input
              type="url"
              value={themeImageUrl}
              onChange={(event) => setThemeImageUrl(event.target.value)}
              className="field"
              placeholder="https://..."
            />
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Or upload an image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setThemeFile(event.target.files?.[0] ?? null)}
              className="field"
            />
          </label>

          <p className="text-xs muted">
            JPG, PNG or WebP, up to 5 MB. Cover images are public by URL, even for private trips. Don’t upload
            tickets or personal documents.
          </p>
        </div>
      </details>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="h-4 w-4 accent-[#263c35]"
        />
        Public itinerary (anyone with link can view)
      </label>

      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !enabled}
        className="rounded-md bg-[var(--ink)] px-4 py-2 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {!enabled ? "Preview only — saving disabled" : loading ? "Creating..." : "Create itinerary"}
      </button>
    </form>
  );
}
