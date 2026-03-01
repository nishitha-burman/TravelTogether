"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
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

type MapView = {
  center: [number, number];
  zoom: number;
};

type GeocodedSuggestion = {
  id: string;
  location: string;
  country: string;
  label: string;
  latitude: number;
  longitude: number;
};

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41]
});

function ClickHandler({ onPick }: { onPick: (coords: PendingMarker) => void }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    }
  });

  return null;
}

function MapViewport({ center, zoom }: MapView) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

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
  const [mapView, setMapView] = useState<MapView>(() => {
    if (markers.length > 0) {
      return {
        center: [markers[0].latitude, markers[0].longitude],
        zoom: 11
      };
    }

    return { center: [20, 0], zoom: 2 };
  });

  const center = useMemo<[number, number]>(() => {
    return mapView.center;
  }, [mapView.center]);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchedExistingMarkers = useMemo(() => {
    if (!normalizedSearch) return markers;
    return markers.filter((marker) => {
      const haystack = `${marker.name} ${marker.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [markers, normalizedSearch]);
  const markerRenderList = normalizedSearch && matchedExistingMarkers.length > 0 ? matchedExistingMarkers : markers;

  useEffect(() => {
    if (markers.length > 0) {
      setMapView({
        center: [markers[0].latitude, markers[0].longitude],
        zoom: 11
      });
    }
  }, [markers]);

  useEffect(() => {
    if (markers.length > 0) return;
    const query = destination.trim();
    if (!query) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        if (!response.ok) return;

        const body = (await response.json()) as { suggestions?: GeocodedSuggestion[] };
        const firstMatch = body.suggestions?.[0];
        if (!firstMatch) return;

        setMapView({
          center: [firstMatch.latitude, firstMatch.longitude],
          zoom: 10
        });
      } catch {
        // Best effort lookup only.
      }
    })();

    return () => {
      controller.abort();
    };
  }, [destination, markers.length]);

  useEffect(() => {
    if (normalizedSearch.length < 2 || matchedExistingMarkers.length === 0) return;
    const first = matchedExistingMarkers[0];
    setMapView({ center: [first.latitude, first.longitude], zoom: 14 });
  }, [matchedExistingMarkers, normalizedSearch]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) return;
    const query = searchQuery.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const cityParam = destination.trim() ? `&city=${encodeURIComponent(destination.trim())}` : "";
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}${cityParam}`, {
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
        <p className="text-sm text-slate-700">Search places in this itinerary city or click the map to pick a point.</p>
      </div>

      <div className="h-80 overflow-hidden rounded-lg border border-[#ffd2e6]">
        <MapContainer center={center} zoom={mapView.zoom} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewport center={mapView.center} zoom={mapView.zoom} />
          <ClickHandler onPick={setPending} />
          {markerRenderList.map((marker) => (
            <Marker key={marker.id} position={[marker.latitude, marker.longitude]} icon={defaultIcon}>
              <Popup>
                <p className="font-semibold">{marker.name}</p>
                {marker.description ? <p>{marker.description}</p> : null}
              </Popup>
            </Marker>
          ))}
          {pending ? (
            <Marker position={[pending.latitude, pending.longitude]} icon={defaultIcon}>
              <Popup>New marker location</Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>

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
                      setMapView({
                        center: [suggestion.latitude, suggestion.longitude],
                        zoom: 14
                      });
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
