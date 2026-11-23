import { test, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calendarEvents, calendarPages } from "@/lib/calendar/view";
import { TripCalendar } from "@/lib/components/trip-calendar";
import { TripTabs } from "@/lib/components/trip-tabs";
import { demoTrip } from "@/lib/demo";

test("calendar aligns weeks to Monday, preserves date gaps and crosses year boundaries", () => {
  const { days } = demoTrip();
  const pages = calendarPages([
    { ...days[0], day_date: "2026-12-31" },
    { ...days[1], day_date: "2027-01-04" },
  ]);
  expect(pages).toHaveLength(2);
  expect(pages[0].cells[0].date).toBe("2026-12-28");
  expect(pages[0].cells[3].days[0].id).toBe(days[0].id);
  expect(pages[0].cells[4].days).toEqual([]);
  expect(pages[1].cells[0].date).toBe("2027-01-04");
  expect(pages[1].cells[0].days[0].id).toBe(days[1].id);
});

test("partially dated trips retain undated days without inventing dates", () => {
  const { days } = demoTrip();
  const input = [
    days[0],
    ...Array.from({ length: 8 }, (_, index) => ({
      ...days[1],
      id: `undated-${index}`,
      day_number: index + 2,
      day_date: null,
    })),
  ];
  const pages = calendarPages(input);
  expect(pages.map((page) => page.dated)).toEqual([true, false, false]);
  expect(
    pages.flatMap((page) => page.cells.flatMap((cell) => cell.days)),
  ).toHaveLength(9);
  expect(pages[1].cells.every((cell) => cell.date === null)).toBe(true);
  expect(calendarPages([])).toEqual([]);
});

test("calendar filters by day, preserves untimed addition order and orders timed entries", () => {
  const { days, events } = demoTrip();
  const entries = [
    { ...events[0], id: "z", title: "First", day_id: days[0].id },
    { ...events[0], id: "a", title: "Second", day_id: days[0].id },
    { ...events[0], id: "late", start_time: "15:00", day_id: days[0].id },
    { ...events[0], id: "early", start_time: "09:00", day_id: days[0].id },
    { ...events[0], id: "other", day_id: days[1].id },
  ];
  expect(calendarEvents(entries, [days[0]]).map((event) => event.id)).toEqual([
    "z",
    "a",
    "early",
    "late",
  ]);
});

test("calendar shows overnight disclosure and untimed events without private notes", () => {
  const { days, events } = demoTrip();
  const entries = [
    events[0],
    {
      ...events[1],
      day_id: days[0].id,
      start_time: "23:00",
      end_time: "01:00",
      notes: "PRIVATE BOOKING",
    },
  ];
  const html = renderToStaticMarkup(
    createElement(TripCalendar, {
      days,
      events: entries,
      timezone: "Pacific/Honolulu",
    }),
  );
  expect(html).toContain("All day");
  expect(html).toContain("(+1 day)");
  expect(html).toContain("Pacific/Honolulu");
  expect(html).not.toContain("PRIVATE BOOKING");
});

test("tabs render itinerary initially and defer inactive panels", () => {
  const html = renderToStaticMarkup(
    createElement(TripTabs, {
      tabs: [
        { id: "itinerary", label: "Itinerary", content: "ITINERARY CONTENT" },
        { id: "calendar", label: "Calendar", content: "CALENDAR CONTENT" },
      ],
    }),
  );
  expect(html).toContain('role="tablist"');
  expect(html).toContain('aria-selected="true"');
  expect(html).toContain('role="tabpanel"');
  expect(html).toContain("ITINERARY CONTENT");
  expect(html).not.toContain("CALENDAR CONTENT");
});
