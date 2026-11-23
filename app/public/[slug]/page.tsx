import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { demoTrip, honoluluPreviewNote } from "@/lib/demo";
import { TripTabs } from "@/lib/components/trip-tabs";
import { TripCalendar } from "@/lib/components/trip-calendar";
import { TripHeading } from "@/lib/components/trip-heading";
import { dateLabel } from "@/lib/calendar/time";
import type { DayRow, EventRow, MarkerRow, TripRow } from "@/types/trip";
// Public data is deliberately a separate domain projection; no private EventRow is fetched.
type PublicPlan = {
  trip: Pick<
    TripRow,
    | "id"
    | "title"
    | "destination"
    | "theme_image_url"
    | "trip_length_days"
    | "start_date"
    | "end_date"
    | "timezone"
  >;
  days: Pick<DayRow, "id" | "day_number" | "label" | "day_date">[];
  events: Pick<
    EventRow,
    "id" | "day_id" | "title" | "event_type" | "start_time" | "end_time"
  >[];
  markers: Pick<MarkerRow, "id" | "name" | "latitude" | "longitude">[];
};
export const dynamic = "force-dynamic";
export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scaffold = !isSupabaseConfigured();
  let plan: PublicPlan;
  if (scaffold) plan = demoTrip();
  else {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_public_itinerary", {
      share_slug: slug,
    });
    // Never fall back to raw tables, even on a legacy deployment or for a signed-in owner.
    if (error)
      return (
        <section className="panel space-y-3">
          <h1 className="page-title">
            This shared itinerary is temporarily unavailable
          </h1>
          <p className="muted">
            Please try again later or ask the trip owner for help.
          </p>
        </section>
      );
    if (!data) notFound();
    plan = data as PublicPlan;
  }
  const { trip, days, events, markers } = plan;
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {scaffold ? (
        <p className="text-xs muted">Sample public itinerary</p>
      ) : null}
      <TripHeading
        title={trip.title}
        destination={trip.destination}
        image={trip.theme_image_url}
        days={days.length}
        startDate={trip.start_date}
        endDate={trip.end_date}
        timezone={trip.timezone ?? null}
        role="Public itinerary · Read only"
        publicView
      />
      {scaffold ? <p className="text-sm muted">{honoluluPreviewNote}</p> : null}
      <p className="border-y border-[var(--line)] py-4 text-sm muted">
        A shared view of the plan. Traveler identities, group notes and booking
        details are private.
      </p>
      <TripTabs
        tabs={[
          {
            id: "itinerary",
            label: "Itinerary",
            content: (
              <section className="space-y-7" aria-labelledby="public-itinerary">
                <h2 id="public-itinerary" className="section-heading">
                  The itinerary
                </h2>
                {days.map((day) => (
                  <article
                    className="border-t border-[var(--line)] pt-5"
                    key={day.id}
                  >
                    <p className="eyebrow">
                      Day {day.day_number}
                      {day.day_date ? ` / ${dateLabel(day.day_date)}` : ""}
                    </p>
                    <h3 className="mt-1 font-serif text-2xl">
                      {day.label || "An open day"}
                    </h3>
                    <ul className="mt-4 divide-y divide-[var(--line)]">
                      {events
                        .filter((e) => e.day_id === day.id)
                        .sort((a, b) =>
                          (a.start_time ?? "").localeCompare(
                            b.start_time ?? "",
                          ),
                        )
                        .map((e) => (
                          <li
                            className="grid grid-cols-[5rem_1fr] gap-4 py-4"
                            key={e.id}
                          >
                            <div className="text-sm tabular-nums">
                              {e.start_time?.slice(0, 5) || "All day"}
                              {e.end_time ? (
                                <p className="mt-1 text-xs muted">
                                  to {e.end_time.slice(0, 5)}
                                  {e.start_time && e.end_time <= e.start_time
                                    ? " +1 day"
                                    : ""}
                                </p>
                              ) : null}
                            </div>
                            <div>
                              <p className="font-semibold">{e.title}</p>
                              <p className="mt-1 text-sm capitalize muted">
                                {e.event_type}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ul>
                    {!events.some((e) => e.day_id === day.id) ? (
                      <p className="mt-4 text-sm muted">Room to explore.</p>
                    ) : null}
                  </article>
                ))}
              </section>
            ),
          },
          {
            id: "calendar",
            label: "Calendar",
            content: (
              <TripCalendar
                days={days}
                events={events}
                timezone={trip.timezone ?? null}
              />
            ),
          },
          {
            id: "places",
            label: "Saved places",
            content: markers.length ? (
              <section className="border-t border-[var(--line)] pt-6">
                <h2 className="section-heading">Saved places</h2>
                <ul className="mt-3 divide-y divide-[var(--line)]">
                  {markers.map((m) => (
                    <li key={m.id} className="py-3">
                      <a
                        className="text-sm underline underline-offset-4"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.name}, ${trip.destination}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {m.name}
                        <span className="sr-only">
                          {" "}
                          — open map in a new tab
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="muted">No saved places yet.</p>
            ),
          },
        ]}
      />
    </div>
  );
}
