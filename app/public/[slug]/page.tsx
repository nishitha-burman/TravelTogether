import Image from "next/image";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function PublicTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <section className="mx-auto max-w-4xl space-y-6">
        <article className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Scaffold mode enabled. Public trip pages are shown using demo data until Supabase is configured.
        </article>
        <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="relative h-64 w-full">
            <Image src="https://images.unsplash.com/photo-1503220317375-aaad61436b1b?q=80&w=1600&auto=format&fit=crop" alt="Public itinerary" fill className="object-cover" />
          </div>
          <div className="p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Public itinerary</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Demo Shared Trip ({slug})</h1>
            <p className="text-slate-600">Barcelona, Spain • 4 days</p>
          </div>
        </article>
      </section>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: trip, error: tripError } = await supabase
    .from("itineraries")
    .select("id, title, destination, theme_image_url, is_public, trip_length_days")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .single();

  if (tripError || !trip) {
    notFound();
  }

  const [{ data: days }, { data: events }, { data: markers }] = await Promise.all([
    supabase.from("trip_days").select("id, day_number, label").eq("itinerary_id", trip.id).order("day_number"),
    supabase
      .from("itinerary_events")
      .select("id, day_id, title, event_type, start_time, end_time, notes")
      .eq("itinerary_id", trip.id),
    supabase.from("itinerary_markers").select("id, name, latitude, longitude").eq("itinerary_id", trip.id)
  ]);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {trip.theme_image_url ? (
          <div className="relative h-64 w-full">
            <Image src={trip.theme_image_url} alt={trip.title} fill className="object-cover" />
          </div>
        ) : null}
        <div className="p-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Public itinerary</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{trip.title}</h1>
          <p className="text-slate-600">
            {trip.destination} • {trip.trip_length_days} days
          </p>
        </div>
      </article>

      <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Markers ({markers?.length ?? 0})</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {markers?.map((marker) => (
            <li key={marker.id}>
              {marker.name}: {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
            </li>
          ))}
        </ul>
      </article>

      <article className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Timeline</h2>
        {days?.map((day) => (
          <div key={day.id} className="rounded-md border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">
              Day {day.day_number} {day.label ? `- ${day.label}` : ""}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {events
                ?.filter((event) => event.day_id === day.id)
                .map((event) => (
                  <li key={event.id}>
                    {event.title} ({event.event_type})
                    {event.start_time ? ` at ${event.start_time}` : ""}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </article>
    </section>
  );
}
