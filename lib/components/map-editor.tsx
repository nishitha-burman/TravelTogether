"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthJsonHeaders } from "@/lib/client-api";
import type { MarkerRow } from "@/types/trip";

type MapEditorProps = {
  tripId: string;
  markers: MarkerRow[];
  destination: string;
};

type PendingMarker = {
  latitude: number;
  longitude: number;
};

type GeocodedSuggestion = {
  id: string;
  location: string;
  country: string;
  label: string;
  latitude: number;
  longitude: number;
};

export function MapEditor({ tripId, markers, destination }: MapEditorProps) {
  const [pending, setPending] = useState<PendingMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodedSuggestion[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [googleMapQuery, setGoogleMapQuery] = useState(destination);
  const googleMapUrl = useMemo(
    () => `https://www.google.com/maps?q=${encodeURIComponent(googleMapQuery || destination)}&z=15&output=embed`,
    [destination, googleMapQuery]
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchedExistingMarkers = useMemo(() => {
    if (!normalizedSearch) return markers;
    return markers.filter((marker) => {
      const haystack = `${marker.name} ${marker.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [markers, normalizedSearch]);
  useEffect(() => {
    if (searchQuery.trim().length < 2) return;
    const query = searchQuery.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const cityParam = destination.trim() ? `&city=${encodeURIComponent(destination.trim())}` : "";
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}${cityParam}&kind=place`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("Failed to search locations");
        }

        const body = (await response.json()) as { suggestions?: GeocodedSuggestion[] };
        const suggestions = body.suggestions ?? [];
        setSearchSuggestions(suggestions);
        setShowSearchSuggestions(suggestions.length > 0);
      } catch {
        if (!controller.signal.aborted) {
          setSearchSuggestions([]);
          setShowSearchSuggestions(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchQuery, destination]);

  async function addMarker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${tripId}/markers`, {
        method: "POST",
        headers: await getAuthJsonHeaders(),
        body: JSON.stringify({
          name,
          description,
          latitude: pending.latitude,
          longitude: pending.longitude
        })
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Could not add marker. Please try again." })) as { error?: string };
        setError(body.error || "Could not add marker");
        return;
      }

      window.location.reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected error while adding marker");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Map markers</h2>
        <p className="text-sm text-slate-700">Explore nearby restaurants, shops, and attractions on Google Maps, or search for a place to save.</p>
      </div>

      <div className="relative h-[26rem] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
        <iframe
          key={googleMapUrl}
          title={`Google Map of ${googleMapQuery || destination}`}
          aria-label={`Google Map of ${googleMapQuery || destination}`}
          src={googleMapUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
          allowFullScreen
        />
      </div>

      {markers.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Saved places">
          <button
            type="button"
            onClick={() => setGoogleMapQuery(destination)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#ff8ab2] hover:bg-[#fff1f7]"
          >
            {destination}
          </button>
          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={() => setGoogleMapQuery(`${marker.name}, ${destination}`)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#ff8ab2] hover:bg-[#fff1f7]"
            >
              📍 {marker.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <label className="text-sm font-medium text-slate-800">
          Search place
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => {
              if (searchSuggestions.length > 0) {
                setShowSearchSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowSearchSuggestions(false), 100);
            }}
            placeholder="Search hotels, landmarks, neighborhoods..."
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          />
        </label>
        {showSearchSuggestions ? (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-[#ffd2e6] bg-white shadow-lg">
            <ul className="max-h-60 overflow-y-auto py-1">
              {searchSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left transition hover:bg-[#fff1f7]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchQuery(suggestion.label);
                      setPending({
                        latitude: suggestion.latitude,
                        longitude: suggestion.longitude
                      });
                      setGoogleMapQuery(`${suggestion.label}, ${destination}`);
                      setName(suggestion.location);
                      setShowSearchSuggestions(false);
                      setSearchSuggestions([]);
                    }}
                  >
                    <span className="block font-medium text-slate-900">{suggestion.location}</span>
                    <span className="block text-sm text-slate-600">{suggestion.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {searchLoading ? <p className="mt-1 text-xs text-slate-700">Searching places near {destination}...</p> : null}
        {normalizedSearch && matchedExistingMarkers.length > 0 ? (
          <p className="mt-1 text-xs text-slate-700">
            Matching existing markers: {matchedExistingMarkers.length}
          </p>
        ) : null}
      </div>

      <form onSubmit={addMarker} className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Description
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <button
          type="submit"
          disabled={!pending || saving}
          className="w-fit rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add marker"}
        </button>
      </form>

      {pending ? (
        <p className="text-xs text-slate-700">
          Selected coordinates: {pending.latitude.toFixed(4)}, {pending.longitude.toFixed(4)}
        </p>
      ) : (
        <p className="text-xs text-slate-700">No location selected yet.</p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
