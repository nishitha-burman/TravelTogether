import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { acceptPendingInvitesByEmail, requireUser } from "@/lib/trips";
import { DeleteItineraryButton } from "@/lib/components/delete-itinerary-button";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    const demoTrips = [
      { id: "demo-lisbon", title: "Lisbon Food Crawl", destination: "Lisbon, Portugal", is_public: false },
      { id: "demo-kyoto", title: "Kyoto Culture Week", destination: "Kyoto, Japan", is_public: true }
    ];

    return (
      <section className="space-y-6">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Scaffold mode enabled. Supabase is not configured, so this dashboard is using mock data.
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#ff4f8b]">Your itineraries</h1>
            <p className="text-slate-700">Create, share and iterate with your group.</p>
          </div>
          <Link href="/trips/new" className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0]">
            New itinerary
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {demoTrips.map((trip) => (
            <article key={trip.id} className="rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6] transition hover:shadow-lg">
              <Link href={`/trips/${trip.id}`} className="block">
                <h2 className="text-xl font-semibold text-slate-900">{trip.title}</h2>
                <p className="text-slate-700">{trip.destination}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {trip.is_public ? "Public" : "Private"} • Demo data
                </p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const { supabase, user } = await requireUser();

  if (user.email) {
    await acceptPendingInvitesByEmail(user.email);
  }

  const [{ data: ownedTrips, error: ownedError }, { data: memberRows, error: memberError }] = await Promise.all([
    supabase
      .from("itineraries")
      .select("id, title, destination, is_public, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("itinerary_members").select("itinerary_id").eq("user_id", user.id)
  ]);

  const memberTripIds = (memberRows ?? []).map((row) => row.itinerary_id);
  const { data: memberTrips, error: memberTripsError } =
    memberTripIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("itineraries")
          .select("id, title, destination, is_public, updated_at")
          .in("id", memberTripIds);

  const tripsMap = new Map<
    string,
    { id: string; title: string; destination: string; is_public: boolean; updated_at: string }
  >();
  for (const trip of [...(ownedTrips ?? []), ...(memberTrips ?? [])]) {
    tripsMap.set(trip.id, trip);
  }

  const trips = Array.from(tripsMap.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const error = ownedError ?? memberError ?? memberTripsError;
  const errorMessage = error?.message ?? null;
  const missingSchema = errorMessage
    ? errorMessage.includes("Could not find the table 'public.itineraries'") ||
      errorMessage.includes('relation "public.itineraries" does not exist')
    : false;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#ff4f8b]">Your itineraries</h1>
          <p className="text-slate-700">Create, share and iterate with your group.</p>
        </div>
        <Link href="/trips/new" className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0]">
          New itinerary
        </Link>
      </div>

      {error ? <p className="text-red-600">Failed to load trips: {error.message}</p> : null}
      {missingSchema ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Database setup is incomplete for this Supabase project. Run <code>supabase/migrations/001_init_triptogether.sql</code>{" "}
          in the Supabase SQL Editor, then refresh this page.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {trips?.map((trip) => (
          <article key={trip.id} className="rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6] transition hover:shadow-lg">
            <Link href={`/trips/${trip.id}`} className="block">
              <h2 className="text-xl font-semibold text-slate-900">{trip.title}</h2>
              <p className="text-slate-700">{trip.destination}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {trip.is_public ? "Public" : "Private"} • Updated {new Date(trip.updated_at).toLocaleDateString()}
              </p>
            </Link>
            <div className="mt-4">
              <DeleteItineraryButton
                tripId={trip.id}
                className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              />
            </div>
          </article>
        ))}
      </div>

      {trips?.length === 0 ? (
        <div className="rounded-xl bg-white/90 p-6 text-slate-700 shadow-md ring-1 ring-[#ffd2e6]">
          No trips yet. Start with destination, image, map markers and day timeline.
        </div>
      ) : null}
    </section>
  );
}
