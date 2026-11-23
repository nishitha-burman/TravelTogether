import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/lib/trips";
import { getTripRole } from "@/lib/api-auth";
import {
  canEditContent,
  canManageTrip,
  type TripRole,
} from "@/lib/permissions";
import { readTrips, readTimeline, readMarkers } from "@/lib/server/trip-data";
import { demoTrip, honoluluPreviewNote } from "@/lib/demo";
import { calendarReadiness } from "@/lib/calendar/readiness";
import { TimelineEditor } from "@/lib/components/timeline-editor";
import { SharingSettings } from "@/lib/components/sharing-settings";
import { MapEditor } from "@/lib/components/map-editor-client";
import { TripSettings } from "@/lib/components/trip-settings";
import { CalendarExport } from "@/lib/components/calendar-export";
import { TripTabs } from "@/lib/components/trip-tabs";
import { TripCalendar } from "@/lib/components/trip-calendar";
import { TripHeading } from "@/lib/components/trip-heading";
export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string; edit?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const scaffold = !isSupabaseConfigured();
  let data = demoTrip(id);
  let role: TripRole | null = "owner";
  if (!scaffold) {
    const { supabase, user } = await requireUser();
    role = await getTripRole(supabase, id, user.id);
    if (!role)
      return (
        <section className="panel space-y-4">
          <h1 className="page-title">This trip isn’t available to you</h1>
          <p className="muted">
            Your access may have changed. Ask the owner for an invitation, or
            return to your trips.
          </p>
          <Link href="/dashboard" className="button">
            Your trips
          </Link>
        </section>
      );
    const [[trip], timeline, markers] = await Promise.all([
      readTrips(supabase, [id]),
      readTimeline(supabase, [id]),
      readMarkers(supabase, id),
    ]);
    if (!trip) notFound();
    data = { trip, ...timeline, markers };
  } else {
    if (query.role === "editor" || query.role === "viewer") role = query.role;
  }
  const { trip, days, events, markers } = data;
  const edit = canEditContent(role),
    manage = canManageTrip(role);
  const readiness = calendarReadiness(trip.timezone, days, events);
  return (
    <div className="space-y-8">
      {scaffold ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3 text-xs muted">
          <span>Sample trip · Changes are not saved</span>
          <nav aria-label="Preview access level" className="flex gap-3">
            {["owner", "editor", "viewer"].map((r) => (
              <Link
                key={r}
                href={`/trips/${id}?role=${r}`}
                aria-current={r === role ? "page" : undefined}
                className={
                  r === role ? "font-bold underline" : "hover:underline"
                }
              >
                {r[0].toUpperCase() + r.slice(1)}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
      <TripHeading
        title={trip.title}
        destination={trip.destination}
        image={trip.theme_image_url}
        days={days.length}
        startDate={trip.start_date}
        endDate={trip.end_date}
        timezone={trip.timezone ?? null}
        role={
          role === "owner"
            ? "Your trip · Owner"
            : role === "editor"
              ? "Editor · You can change the itinerary"
              : "Viewer · Read-only itinerary"
        }
      />
      {scaffold && id !== "demo-kyoto" ? (
        <p className="text-sm muted">{honoluluPreviewNote}</p>
      ) : null}
      {manage ? (
        <TripSettings
          trip={trip}
          days={days}
          events={events}
          initiallyOpen={query.edit === "1"}
          scaffold={scaffold}
        />
      ) : null}
      <TripTabs
        tabs={[
          {
            id: "itinerary",
            label: "Itinerary",
            content: (
              <TimelineEditor
                tripId={id}
                days={days}
                events={events}
                timezone={trip.timezone}
                canEdit={edit}
                scaffold={scaffold}
              />
            ),
          },
          {
            id: "calendar",
            label: "Calendar",
            content: (
              <>
                <TripCalendar
                  days={days}
                  events={events}
                  timezone={trip.timezone ?? null}
                />
                <CalendarExport
                  tripId={id}
                  readiness={readiness}
                  timezone={trip.timezone ?? null}
                  startDate={trip.start_date}
                  destination={trip.destination}
                  canEdit={edit}
                  scaffold={scaffold}
                />
              </>
            ),
          },
          {
            id: "places",
            label: "Saved places",
            content: (
              <MapEditor
                tripId={id}
                markers={markers}
                destination={trip.destination}
                canEdit={edit}
                scaffold={scaffold}
              />
            ),
          },
          ...(manage
            ? [
                {
                  id: "sharing",
                  label: "Travelers & sharing",
                  content: (
                    <>
                      <SharingSettings
                        tripId={id}
                        isPublic={trip.is_public}
                        publicSlug={trip.public_slug}
                        scaffold={scaffold}
                        initiallyOpen
                      />
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
