import { test, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
