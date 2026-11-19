import { test } from "vitest";
import assert from "node:assert/strict";
import { buildTripCalendar, calendarFilename } from "../lib/calendar/ics";
import { calendarReadiness } from "../lib/calendar/readiness";
import { eventInstants } from "../lib/calendar/time";
import { canEditContent, canManageTrip } from "../lib/permissions";
import { createEventSchema } from "../lib/schemas";
const trip = { title: "Summer; together", destination: "Lisbon", timezone: "Europe/Lisbon" };
const days = [{ id: "day", day_date: "2026-07-01" }];
const event = {
  id: "stable-id",
  day_id: "day",
  title: "Lunch, a walk; café\\friends\rINJECT:bad",
  event_type: "food" as const,
  start_time: "12:30",
  end_time: "14:00",
  metadata: { location: "A place, Lisbon", bookingUrl: "SECRET", confirmationCode: "SECRET" },
  notes: "SECRET",
  sequence: 3,
  updated_at: "2026-06-01T15:00:00Z",
};
const generatedAt = new Date("2026-06-02T00:00:00Z");
function ics(overrides = {}) {
  return buildTripCalendar({ trip, days, events: [{ ...event, ...overrides }], generatedAt });
}
test("ICS has stable identity, UTC summer times, revision data and excludes private fields", () => {
  const result = ics();
  assert.match(result, /UID:stable-id@traveltogether.app/);
  assert.match(result, /DTSTART:20260701T113000Z/);
  assert.match(result, /DTEND:20260701T130000Z/);
  assert.match(result, /SEQUENCE:3/);
  assert.match(result, /LAST-MODIFIED:20260601T150000Z/);
  assert.doesNotMatch(result, /SECRET/);
  const updated = ics({ title: "Changed", sequence: 4 });
  assert.match(updated, /UID:stable-id@traveltogether.app/);
  assert.match(updated, /SEQUENCE:4/);
});
test("text escaping blocks CR injection and folds UTF-8 at 75 bytes", () => {
  const result = ics({ title: event.title + "🧳".repeat(80) });
  assert.match(result, /Lunch\\, a walk\\; café\\\\friends\\nINJECT:bad/);
  assert.doesNotMatch(result, /\r\nINJECT:/);
  for (const line of result.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(result.endsWith("\r\n"));
  assert.ok(!result.includes("\uFFFD"));
});
test("all-day end is exclusive and crosses year boundary", () => {
  const result = buildTripCalendar({
    trip,
    days: [{ id: "day", day_date: "2026-12-31" }],
    events: [{ ...event, start_time: null, end_time: null }],
  });
  assert.match(result, /DTSTART;VALUE=DATE:20261231/);
  assert.match(result, /DTEND;VALUE=DATE:20270101/);
});
test("overnight and one-hour default duration cross midnight", () => {
  assert.match(ics({ start_time: "23:30", end_time: "01:00" }), /DTEND:20260702T000000Z/);
  assert.match(ics({ start_time: "23:30", end_time: null }), /DTEND:20260701T233000Z/);
});
test("winter offset and non-integer offset are correct", () => {
  assert.equal(
    eventInstants("2026-12-01", "12:00", null, "Europe/Lisbon").start.toString(),
    "2026-12-01T12:00:00Z",
  );
  assert.equal(
    eventInstants("2026-12-01", "12:00", null, "Asia/Kathmandu").start.toString(),
    "2026-12-01T06:15:00Z",
  );
});
test("DST gaps and ambiguous repeated times require an explicit correction", () => {
  for (const date of ["2026-03-08", "2026-11-01"]) {
    const start = date.includes("03-") ? "02:30" : "01:30";
    assert.throws(() => eventInstants(date, start, null, "America/New_York"));
    assert.equal(
      calendarReadiness(
        "America/New_York",
        [{ id: "day", day_date: date }],
        [{ ...event, start_time: start }],
      ).ready,
      false,
    );
  }
});
test("readiness blocks missing dates, missing timezone, invalid times and empty plans", () => {
  assert.equal(calendarReadiness(null, days, [event]).ready, false);
  assert.equal(calendarReadiness(trip.timezone, [{ id: "day", day_date: null }], [event]).ready, false);
  assert.equal(calendarReadiness(trip.timezone, days, []).ready, false);
  assert.equal(calendarReadiness(trip.timezone, days, [{ ...event, start_time: "99:00" }]).ready, false);
  assert.equal(calendarReadiness(trip.timezone, days, [{ ...event, start_time: null }]).ready, false);
  assert.throws(() => buildTripCalendar({ trip: { ...trip, timezone: null }, days, events: [event] }));
});
test("export omission represents deletion only in a new snapshot, without claiming cancellation", () => {
  const result = buildTripCalendar({ trip, days, events: [{ ...event, id: "remaining" }], generatedAt });
  assert.doesNotMatch(result, /stable-id|STATUS:CANCELLED/);
  assert.match(result, /UID:remaining/);
});
test("roles and strict event validation preserve capabilities", () => {
  assert.ok(canEditContent("owner"));
  assert.ok(canEditContent("editor"));
  assert.equal(canEditContent("viewer"), false);
  assert.equal(canEditContent(null), false);
  assert.ok(canManageTrip("owner"));
  assert.equal(canManageTrip("editor"), false);
  const body = { dayId: "11111111-1111-4111-8111-111111111111", title: "Walk", eventType: "activity" };
  assert.ok(createEventSchema.safeParse(body).success);
  assert.equal(createEventSchema.safeParse({ ...body, startTime: "25:00" }).success, false);
  assert.equal(createEventSchema.safeParse({ ...body, owner_id: "injected" }).success, false);
  assert.equal(calendarFilename(" / "), "trip-calendar.ics");
});
