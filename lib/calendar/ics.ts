import { Temporal } from "@js-temporal/polyfill";
import type { DayRow, EventRow } from "@/types/trip";
import { eventInstants } from "@/lib/calendar/time";
import { calendarReadiness } from "@/lib/calendar/readiness";
type Options = {
  trip: { title: string; destination: string; timezone?: string | null };
  days: Pick<DayRow, "id" | "day_date">[];
  events: Pick<
    EventRow,
    | "id"
    | "day_id"
    | "title"
    | "event_type"
    | "start_time"
    | "end_time"
    | "metadata"
    | "sequence"
    | "updated_at"
  >[];
  generatedAt?: Date;
};
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}
function foldLine(line: string) {
  const chunks: string[] = [];
  let chunk = "";
  let bytes = 0;
  for (const character of line) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 75 && chunk) {
      chunks.push(chunk);
      chunk = " ";
      bytes = 1;
    }
    chunk += character;
    bytes += size;
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}
const timestamp = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
export function buildTripCalendar({ trip, days, events, generatedAt = new Date() }: Options) {
  const readiness = calendarReadiness(trip.timezone, days, events);
  if (!readiness.ready) throw new Error(readiness.issues.join(" "));
  const dates = new Map(days.map((d) => [d.id, d.day_date!]));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TravelTogether//Trip Itinerary//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(trip.title)}`,
    `X-WR-TIMEZONE:${escapeText(trip.timezone!)}`,
  ];
  // Stable ordering makes equivalent snapshots comparable.
  const ordered = [...events].sort((a, b) =>
    `${dates.get(a.day_id)}${a.start_time ?? ""}${a.id}`.localeCompare(
      `${dates.get(b.day_id)}${b.start_time ?? ""}${b.id}`,
    ),
  );
  for (const event of ordered) {
    const date = dates.get(event.day_id)!;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.id)}@traveltogether.app`,
      `DTSTAMP:${timestamp(generatedAt.toISOString())}`,
      `LAST-MODIFIED:${timestamp(event.updated_at ?? generatedAt.toISOString())}`,
      `SEQUENCE:${event.sequence ?? 0}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(`${trip.title} · ${trip.destination}\nTimes planned in ${trip.timezone}.`)}`,
      `CATEGORIES:${event.event_type.toUpperCase()}`,
    );
    const location = event.metadata?.location;
    if (typeof location === "string" && location.trim())
      lines.push(`LOCATION:${escapeText(location.trim())}`);
    if (!event.start_time) {
      lines.push(
        `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${Temporal.PlainDate.from(date).add({ days: 1 }).toString().replaceAll("-", "")}`,
      );
    } else {
      const range = eventInstants(date, event.start_time, event.end_time, trip.timezone!);
      lines.push(`DTSTART:${timestamp(range.start.toString())}`, `DTEND:${timestamp(range.end.toString())}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
export function calendarFilename(title: string) {
  const safe = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${safe || "trip"}-calendar.ics`;
}
