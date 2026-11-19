"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTripMutation } from "@/lib/components/use-trip-mutation";
import type { MarkerRow } from "@/types/trip";

type MapEditorProps = {
  canEdit?: boolean;
  scaffold?: boolean;
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

export function MapEditor({
  tripId,
  markers,
  destination,
  canEdit = false,
  scaffold = false,
}: MapEditorProps) {
  const addition = useTripMutation();
  const removal = useTripMutation();
  const nameInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodedSuggestion[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [googleMapQuery, setGoogleMapQuery] = useState(destination);
  const googleMapUrl = useMemo(
    () =>
      `https://www.google.com/maps?q=${encodeURIComponent(googleMapQuery || destination)}&z=15&output=embed`,
    [destination, googleMapQuery],
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
    if (searchQuery.trim().length < 2 || pending) return;
    const query = searchQuery.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const cityParam = destination.trim() ? `&city=${encodeURIComponent(destination.trim())}` : "";
        const response = await fetch(
          `/api/locations/search?q=${encodeURIComponent(query)}${cityParam}&kind=place`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new Error("Failed to search locations");
        }

        const body = (await response.json()) as { suggestions?: GeocodedSuggestion[] };
        const suggestions = body.suggestions ?? [];
        setSearchSuggestions(suggestions);
        setShowSearchSuggestions(suggestions.length > 0);
        setSearched(true);
      } catch {
        if (!controller.signal.aborted) {
          setSearchSuggestions([]);
          setShowSearchSuggestions(false);
          setSearchError("Could not search places. Check your connection and try again.");
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
  }, [searchQuery, destination, pending]);

  async function addMarker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending || scaffold) return;
    await addition.mutate(
      `/api/trips/${tripId}/markers`,
      "POST",
      {
        name,
        description,
        latitude: pending.latitude,
        longitude: pending.longitude,
      },
      () => {
        setPending(null);
        setName("");
        setDescription("");
        setSearchQuery("");
        setSearched(false);
      },
    );
  }

  return (
    <section id="places" className="space-y-4 border-t border-[var(--line)] pt-6">
      <div>
        <h2 className="section-heading">Saved places</h2>
        <p className="text-sm muted">
          {canEdit
            ? "Explore the map, or search for a place to keep with the plan."
            : "Explore the places saved by your group."}
        </p>
      </div>

      <div className="relative h-72 overflow-hidden rounded-sm border border-[var(--line)]">
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
            className="button-secondary text-xs"
          >
            {destination}
          </button>
          {markers.map((marker) => (
            <div key={marker.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGoogleMapQuery(`${marker.name}, ${destination}`)}
                className="button-secondary text-xs"
              >
                {marker.name}
              </button>
              {canEdit ? (
                <button
                  className="text-button"
                  aria-label={`Remove ${marker.name}`}
                  disabled={scaffold || removal.saving}
                  onClick={() => {
                    if (window.confirm(`Remove ${marker.name} from saved places?`))
                      void removal.mutate(`/api/trips/${tripId}/markers`, "DELETE", { markerId: marker.id });
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <>
          <div className="relative">
            <label className="field-label">
              Search place
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPending(null);
                  setSearchSuggestions([]);
                  setShowSearchSuggestions(false);
                  setSearchLoading(false);
                  setSearchError(null);
                  setSearched(false);
                }}
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSearchSuggestions(true);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setShowSearchSuggestions(false);
                }}
                placeholder="Search hotels, landmarks, neighborhoods..."
                className="field"
              />
            </label>
            {showSearchSuggestions ? (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-[var(--line)] bg-white shadow-lg">
                <ul className="max-h-60 overflow-y-auto py-1">
                  {searchSuggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left transition hover:bg-[#edf0e9]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSearchQuery(suggestion.label);
                          setPending({
                            latitude: suggestion.latitude,
                            longitude: suggestion.longitude,
                          });
                          setGoogleMapQuery(`${suggestion.label}, ${destination}`);
                          setName(suggestion.location);
                          setShowSearchSuggestions(false);
                          setSearchSuggestions([]);
                          nameInput.current?.focus();
                        }}
                      >
                        <span className="block font-medium">{suggestion.location}</span>
                        <span className="block text-sm muted">{suggestion.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {searchLoading ? (
              <p className="mt-1 text-xs muted" role="status">
                Searching places near {destination}…
              </p>
            ) : null}
            {searchError ? (
              <p className="error mt-2" role="alert">
                {searchError}
              </p>
            ) : null}
            {searched && !pending && !searchLoading && searchSuggestions.length === 0 ? (
              <p className="mt-2 text-sm muted" role="status">
                No places found. Try a nearby landmark or a more specific name.
              </p>
            ) : null}
            {normalizedSearch && matchedExistingMarkers.length > 0 ? (
              <p className="mt-1 text-xs muted">Already saved: {matchedExistingMarkers.length}</p>
            ) : null}
          </div>

          <form onSubmit={addMarker} className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Name
              <input
                className="field"
                ref={nameInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className="field-label">
              Description
              <input
                className="field"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional"
              />
            </label>
            <button type="submit" disabled={!pending || addition.saving || scaffold} className="button w-fit">
              {addition.saving ? "Saving…" : "Save place"}
            </button>
          </form>

          {pending ? (
            <p className="text-xs muted">Selected place: {name}</p>
          ) : (
            <p className="text-xs muted">Search for a place, then select a result to save it.</p>
          )}
        </>
      ) : null}
      {removal.error ? (
        <p role="alert" className="error">
          {removal.error}
        </p>
      ) : null}
      <p role="status" className="status">
        {removal.status}
      </p>
      <p role="status" className="status">
        {addition.status}
      </p>
      {addition.error ? (
        <p role="alert" className="error">
          {addition.error}
        </p>
      ) : null}
    </section>
  );
}
