"use client";

import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { getAuthJsonHeaders } from "@/lib/client-api";
import type { MarkerRow } from "@/types/trip";

type MapEditorProps = {
  tripId: string;
  markers: MarkerRow[];
};

type PendingMarker = {
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

export function MapEditor({ tripId, markers }: MapEditorProps) {
  const [pending, setPending] = useState<PendingMarker | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const center = useMemo(() => {
    if (markers.length > 0) {
      return [markers[0].latitude, markers[0].longitude] as [number, number];
    }

    return [20, 0] as [number, number];
  }, [markers]);

  async function addMarker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) return;

    setSaving(true);
    setError(null);

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

    setSaving(false);

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not add marker");
      return;
    }

    window.location.reload();
  }

  return (
    <section className="space-y-3 rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Map markers</h2>
        <p className="text-sm text-slate-700">Click the map to pick a point, then add details.</p>
      </div>

      <div className="h-80 overflow-hidden rounded-lg border border-[#ffd2e6]">
        <MapContainer center={center} zoom={2} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={setPending} />
          {markers.map((marker) => (
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
