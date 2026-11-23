import { test, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileForm } from "@/lib/components/profile-form";
import { TripSettings } from "@/lib/components/trip-settings";
import { TimelineEditor } from "@/lib/components/timeline-editor";
import { CalendarExport } from "@/lib/components/calendar-export";
import { demoTrip } from "@/lib/demo";
import { calendarReadiness } from "@/lib/calendar/readiness";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
test("scaffold workspace uses real timeline and disables persistence", () => {
  const { trip, days, events } = demoTrip();
  const timeline = renderToStaticMarkup(
    createElement(TimelineEditor, {
      tripId: trip.id,
      days,
      events,
      canEdit: true,
      scaffold: true,
    }),
  );
  expect(timeline).toContain("Poke at Maguro Spot");
  expect(timeline).toContain("Changes are not saved");
  expect(timeline).toContain("Add event");
  const calendar = renderToStaticMarkup(
    createElement(CalendarExport, {
      tripId: trip.id,
      readiness: calendarReadiness(trip.timezone, days, events),
      timezone: trip.timezone!,
      startDate: trip.start_date,
      destination: trip.destination,
      canEdit: true,
      scaffold: true,
    }),
  );
  expect(calendar).toContain('disabled=""');
  expect(calendar).toContain("Download calendar snapshot");
  expect(calendar).toContain("won’t update");
});
test("viewer rendering has no itinerary mutations or date assignment", () => {
  const { trip, days, events } = demoTrip();
  const timeline = renderToStaticMarkup(
    createElement(TimelineEditor, {
      tripId: trip.id,
      days,
      events,
      canEdit: false,
    }),
  );
  expect(timeline).not.toContain("Add event");
  expect(timeline).not.toContain("Delete event");
  expect(timeline).not.toContain("Day options");
  const calendar = renderToStaticMarkup(
    createElement(CalendarExport, {
      tripId: trip.id,
      readiness: calendarReadiness(trip.timezone, days, events),
      timezone: trip.timezone!,
      startDate: trip.start_date,
      destination: trip.destination,
      canEdit: false,
    }),
  );
  expect(calendar).not.toContain("Save dates");
  expect(calendar).toContain("Download calendar snapshot");
});

test("timeline preserves addition order for untimed events instead of sorting UUIDs", () => {
  const { trip, days, events } = demoTrip();
  const entries = [
    { ...events[0], id: "z-first", title: "First added", day_id: days[0].id },
    { ...events[0], id: "a-second", title: "Second added", day_id: days[0].id },
    {
      ...events[0],
      id: "later",
      title: "Later clock time",
      day_id: days[0].id,
      start_time: "15:00",
    },
    {
      ...events[0],
      id: "earlier",
      title: "Earlier clock time",
      day_id: days[0].id,
      start_time: "09:00",
    },
  ];
  const html = renderToStaticMarkup(
    createElement(TimelineEditor, { tripId: trip.id, days, events: entries }),
  );
  expect(html.indexOf("First added")).toBeLessThan(
    html.indexOf("Second added"),
  );
  expect(html.indexOf("Earlier clock time")).toBeLessThan(
    html.indexOf("Later clock time"),
  );
});

test("trip settings expose title and scheduling while scaffold writes remain disabled", () => {
  const data = demoTrip();
  const html = renderToStaticMarkup(createElement(TripSettings, { ...data, initiallyOpen:true, scaffold:true }));
  expect(html).toContain("Edit trip details");
  expect(html).toContain("Trip title");
  expect(html).toContain("Actual dates");
  expect(html).toContain("Number of days");
  expect(html).toContain("Delete trip");
  expect(html).toContain("Saving and deletion are disabled");
  expect(html).toContain('disabled=""');
});

test("profile scaffold keeps fields editable but disables saving and discloses privacy", () => {
  const profile = {id:"owner",display_name:"Traveler",home_city:null,bio:null,created_at:"2026-11-01T12:00:00Z"};
  const html = renderToStaticMarkup(createElement(ProfileForm, {profile,enabled:true,scaffold:true}));
  expect(html).toContain("Name");
  expect(html).toContain("Home city");
  expect(html).toContain("Your profile is private");
  expect(html).toContain("Changes are not saved");
  expect(html).toContain('disabled=""');
});
