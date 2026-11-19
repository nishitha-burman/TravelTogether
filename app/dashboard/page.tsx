import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { acceptPendingInvitesByEmail, requireUser } from "@/lib/trips";
import { demoTrip } from "@/lib/demo";
import { readTrips, readTimeline } from "@/lib/server/trip-data";
import { calendarReadiness } from "@/lib/calendar/readiness";
import { dateLabel } from "@/lib/calendar/time";
import type { TripRole } from "@/lib/permissions";
import type { TripRow, DayRow, EventRow } from "@/types/trip";
export default async function DashboardPage() {
  const scaffold = !isSupabaseConfigured();
  let warning: string | null = null;
  let plans: { trip: TripRow; days: DayRow[]; events: EventRow[]; role: TripRole }[] = [];
  if (scaffold)
    plans = [
      { ...demoTrip(), role: "owner" },
      { ...demoTrip("demo-kyoto"), role: "editor" },
    ];
  else {
    const { supabase, user } = await requireUser();
    warning = await acceptPendingInvitesByEmail();
    const [owned, members] = await Promise.all([
      supabase.from("itineraries").select("id").eq("owner_id", user.id),
      supabase.from("itinerary_members").select("itinerary_id,role").eq("user_id", user.id),
    ]);
    if (owned.error || members.error) throw new Error("Could not load your trips. Please retry.");
    const ids = Array.from(
      new Set([...(owned.data ?? []).map((t) => t.id), ...(members.data ?? []).map((t) => t.itinerary_id)]),
    );
    if (ids.length) {
      const [trips, { days, events }] = await Promise.all([
        readTrips(supabase, ids),
        readTimeline(supabase, ids),
      ]);
      plans = trips.map((trip) => ({
        trip,
        days: days.filter((d) => d.itinerary_id === trip.id),
        events: events.filter((e) => e.itinerary_id === trip.id),
        role:
          trip.owner_id === user.id
            ? "owner"
            : members.data?.find((m) => m.itinerary_id === trip.id)?.role === "editor"
              ? "editor"
              : "viewer",
      }));
    }
  }
  plans.sort((a, b) => b.trip.updated_at.localeCompare(a.trip.updated_at));
  const today = new Date().toISOString().slice(0, 10);
  const groups = [
    {
      title: "Coming up",
      items: plans.filter((p) => p.trip.start_date && (!p.trip.end_date || p.trip.end_date >= today)),
    },
    { title: "Dates open", items: plans.filter((p) => !p.trip.start_date) },
    {
      title: "Past trips",
      items: plans.filter((p) => p.trip.start_date && p.trip.end_date && p.trip.end_date < today),
    },
  ];
  return (
    <div className="space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">The days ahead</p>
          <h1 className="page-title mt-2">Your trips</h1>
          <p className="mt-3 text-sm muted">Pick up a plan, or start with somewhere you’d like to go.</p>
        </div>
        <Link href="/trips/new" className="button">
          New trip
        </Link>
      </header>
      {scaffold ? (
        <p className="text-sm muted">Sample trips · Explore planning, editing and calendar readiness.</p>
      ) : null}
      {warning ? (
        <p role="alert" className="error">
          {warning}
        </p>
      ) : null}
      {groups
        .filter((g) => g.items.length)
        .map((group) => (
          <section key={group.title}>
            <h2 className="eyebrow mb-4">{group.title}</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {group.items.map(({ trip, days, events, role }) => {
                const ready = calendarReadiness(trip.timezone, days, events);
                return (
                  <article key={trip.id} className="border-t border-[var(--line)] py-5">
                    <p className="text-xs muted">
                      {trip.destination} ·{" "}
                      {role === "owner" ? "Owner" : role === "editor" ? "Can edit" : "View only"}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl">
                      <Link
                        href={`/trips/${trip.id}${scaffold ? `?role=${role}` : ""}`}
                        className="hover:underline"
                      >
                        {trip.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm">
                      {dateLabel(trip.start_date)} · {days.length} days
                    </p>
                    <p className="mt-3 text-sm muted">
                      {ready.ready
                        ? `${events.length} events ready for your calendar`
                        : !events.length
                          ? "Add the first event"
                          : !trip.start_date
                            ? "Choose dates when you’re ready"
                            : !trip.timezone
                              ? "Choose a timezone for your calendar"
                              : "Review calendar details"}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/trips/${trip.id}${scaffold ? `?role=${role}` : ""}`}
                        className="text-sm font-semibold underline underline-offset-4"
                      >
                        {role === "viewer" ? "View itinerary" : "Continue planning"} →
                      </Link>
                      <p className="text-xs muted">Updated {dateLabel(trip.updated_at.slice(0, 10))}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      {!plans.length ? (
        <section className="border-t border-[var(--line)] py-10">
          <h2 className="font-serif text-2xl">Where would you like to go?</h2>
          <p className="mt-3 max-w-md muted">
            Start with a destination and a few days. You can decide the dates and invite your travelers later.
          </p>
          <Link href="/trips/new" className="button mt-5">
            Plan your first trip
          </Link>
        </section>
      ) : null}
    </div>
  );
}
