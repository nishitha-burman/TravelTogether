"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
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
    void (async () => {
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
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

    return () => {
      controller.abort();
    };
  }, [city]);

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
          city,
          planningMode,
          tripLengthDays: planningMode === "days" ? tripLengthDays : undefined,
          startDate: planningMode === "date_range" ? startDate : undefined,
          endDate: planningMode === "date_range" ? endDate : undefined,
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white/90 p-6 shadow-md ring-1 ring-[#ffd2e6]">
      <label className="block text-sm font-medium text-slate-800">
        Trip title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          placeholder="Summer in Lisbon"
          required
        />
      </label>

      <div className="relative">
        <label className="block text-sm font-medium text-slate-800">
          City
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            onFocus={() => {
              if (destinationSuggestions.length > 0) {
                setShowDestinationSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowDestinationSuggestions(false), 100);
            }}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            placeholder="Lisbon, Portugal"
            required
          />
        </label>

        {showDestinationSuggestions ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-[#ffd2e6] bg-white shadow-lg">
            <ul className="max-h-64 overflow-y-auto py-1" role="listbox" aria-label="Destination suggestions">
              {destinationSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left transition hover:bg-[#fff1f7]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      skipNextLookupRef.current = true;
                      setCity(suggestion.label);
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
        {destinationLoading ? <p className="mt-1 text-xs text-slate-700">Looking up destinations...</p> : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">Planning mode</legend>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="planningMode"
            value="days"
            checked={planningMode === "days"}
            onChange={() => setPlanningMode("days")}
            className="h-4 w-4 accent-[#ff4f8b]"
          />
          Plan by number of days
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="planningMode"
            value="date_range"
            checked={planningMode === "date_range"}
            onChange={() => setPlanningMode("date_range")}
            className="h-4 w-4 accent-[#ff4f8b]"
          />
          Plan by calendar date range
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
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
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
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
              required
            />
          </label>
        </div>
      )}

      <label className="block text-sm font-medium text-slate-800">
        Theme image URL (optional)
        <input
          type="url"
          value={themeImageUrl}
          onChange={(event) => setThemeImageUrl(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          placeholder="https://..."
        />
      </label>

      <label className="block text-sm font-medium text-slate-800">
        Or upload theme image (optional)
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setThemeFile(event.target.files?.[0] ?? null)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="h-4 w-4 accent-[#ff4f8b]"
        />
        Public itinerary (anyone with link can view)
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || !enabled}
        className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0] disabled:opacity-60"
      >
        {!enabled ? "Supabase not configured" : loading ? "Creating..." : "Create itinerary"}
      </button>
    </form>
  );
}
