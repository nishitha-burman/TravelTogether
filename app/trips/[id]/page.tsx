import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/lib/trips";
import { TimelineEditor } from "@/lib/components/timeline-editor";
import { SharingSettings } from "@/lib/components/sharing-settings";
import { MapEditor } from "@/lib/components/map-editor-client";
import { DeleteItineraryButton } from "@/lib/components/delete-itinerary-button";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <section className="space-y-6">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Scaffold mode enabled. This trip page is rendering with mock content.
        </div>

        <div className="overflow-hidden rounded-2xl bg-white/90 shadow-md ring-1 ring-[#ffd2e6]">
          <div className="relative h-72 w-full bg-slate-900 md:h-96">
            <Image
              src="https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1600&auto=format&fit=crop"
              alt="Demo trip"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 space-y-2 p-6 text-white">
              <Link href="/dashboard" className="text-sm font-medium text-white/90 hover:underline">
                ← Back to dashboard
              </Link>
              <h1 className="text-3xl font-bold">Demo Itinerary ({id})</h1>
              <p className="text-white/90">Lisbon, Portugal • 5 days</p>
            </div>
          </div>
        </div>

        <section className="rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
          <h2 className="text-xl font-semibold text-slate-900">Sharing</h2>
          <p className="mt-2 text-sm text-slate-700">Private/public controls and email invites will activate after Supabase setup.</p>
        </section>

        <MapEditor
          tripId={id}
          destination="Lisbon, Portugal"
          markers={[
            {
              id: "demo-belem",
              itinerary_id: id,
              name: "Belém Tower",
              description: "Waterfront landmark",
              latitude: 38.6916,
              longitude: -9.216
            },
            {
              id: "demo-alfama",
              itinerary_id: id,
              name: "Alfama",
              description: "Historic neighborhood",
              latitude: 38.711,
              longitude: -9.1294
            }
          ]}
        />

        <section className="rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
          <h2 className="text-xl font-semibold text-slate-900">Timeline</h2>
          <p className="mt-2 text-sm text-slate-700">Day-by-day planner UI is ready; event persistence will activate with Supabase.</p>
          <div className="mt-3 space-y-2 text-sm text-slate-800">
            <p>Day 1 - Arrival</p>
            <p>Day 2 - Museum and food tour</p>
            <p>Day 3 - Intercity travel</p>
          </div>
        </section>
      </section>
    );
  }

  const { supabase } = await requireUser();

  let { data: trip, error: tripError } = await supabase
    .from("itineraries")
    .select("id, title, city, destination, planning_mode, start_date, end_date, theme_image_url, is_public, public_slug, trip_length_days")
    .eq("id", id)
    .single();

  if (tripError && tripError.message.toLowerCase().includes("column")) {
    const fallback = await supabase
      .from("itineraries")
      .select("id, title, destination, theme_image_url, is_public, public_slug, trip_length_days")
      .eq("id", id)
      .single();
    trip = fallback.data
      ? {
          ...fallback.data,
          city: fallback.data.destination,
          planning_mode: "days",
          start_date: null,
          end_date: null
        }
      : null;
    tripError = fallback.error;
  }

  if (tripError || !trip) {
    notFound();
  }

  const [{ data: daysData }, { data: events }, { data: markers }] = await Promise.all([
    supabase
      .from("trip_days")
      .select("id, itinerary_id, day_number, label, day_date")
      .eq("itinerary_id", id)
      .order("day_number"),
    supabase
      .from("itinerary_events")
      .select("id, itinerary_id, day_id, title, event_type, start_time, end_time, notes, metadata")
      .eq("itinerary_id", id),
    supabase
      .from("itinerary_markers")
      .select("id, itinerary_id, name, description, latitude, longitude")
      .eq("itinerary_id", id)
  ]);

  let days = daysData;
  if (!days) {
    const fallbackDays = await supabase
      .from("trip_days")
      .select("id, itinerary_id, day_number, label")
      .eq("itinerary_id", id)
      .order("day_number");
    days = (fallbackDays.data ?? []).map((day) => ({ ...day, day_date: null }));
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-white/90 shadow-md ring-1 ring-[#ffd2e6]">
        {trip.theme_image_url ? (
          <div className="relative h-72 w-full bg-slate-900 md:h-96">
            <Image src={trip.theme_image_url} alt={trip.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 space-y-2 p-6 text-white">
              <Link href="/dashboard" className="text-sm font-medium text-white/90 hover:underline">
                ← Back to dashboard
              </Link>
              <h1 className="text-3xl font-bold">{trip.title}</h1>
              <p className="text-white/90">
                {trip.destination} • {trip.trip_length_days} days
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-6">
            <Link href="/dashboard" className="text-sm font-medium text-[#ff4f8b] hover:underline">
              ← Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">{trip.title}</h1>
            <p className="text-slate-700">
              {trip.destination} • {trip.trip_length_days} days
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <DeleteItineraryButton tripId={trip.id} redirectToDashboard />
      </div>

      <SharingSettings tripId={trip.id} isPublic={trip.is_public} publicSlug={trip.public_slug} />
      <MapEditor tripId={trip.id} markers={markers ?? []} destination={trip.city ?? trip.destination} />
      <TimelineEditor
        tripId={trip.id}
        days={days ?? []}
        events={events ?? []}
        planningMode={trip.planning_mode ?? "days"}
      />

      <section className="rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
        <h2 className="text-lg font-semibold text-slate-900">Planned for later phases</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Google Calendar export from timeline events.</li>
          <li>Apple Calendar export (ICS feed/file).</li>
          <li>Photo uploads with per-trip and per-user limits.</li>
          <li>Automated conflict checks for overlapping transport/stays.</li>
        </ul>
      </section>
    </section>
  );
}
