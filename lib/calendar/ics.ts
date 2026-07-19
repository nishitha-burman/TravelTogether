import type { DayRow, EventRow } from "@/types/trip";

type CalendarTrip = {
  title: string;
  destination: string;
};

type BuildTripCalendarOptions = {
  trip: CalendarTrip;
  days: Pick<DayRow, "id" | "day_date">[];
  events: Pick<
    EventRow,
    "id" | "day_id" | "title" | "event_type" | "start_time" | "end_time" | "notes" | "metadata"
  >[];
  generatedAt?: Date;
};

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string) {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = "";
  let byteLength = 0;

  for (const character of line) {
    const characterLength = encoder.encode(character).length;
    if (byteLength + characterLength > 75 && chunk) {
      chunks.push(chunk);
      chunk = ` ${character}`;
      byteLength = 1 + characterLength;
    } else {
      chunk += character;
      byteLength += characterLength;
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks.join("\r\n");
}

function compactDate(date: string) {
  return date.replaceAll("-", "");
}

function compactTime(time: string) {
  const [hours = "00", minutes = "00", seconds = "00"] = time.split(":");
  return `${hours}${minutes}${seconds}`;
}

function addMinutes(time: string, minutesToAdd: number) {
  const [hours = "0", minutes = "0"] = time.split(":");
  const totalMinutes = Number(hours) * 60 + Number(minutes) + minutesToAdd;
  const wrappedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  return {
    time: `${String(Math.floor(wrappedMinutes / 60)).padStart(2, "0")}:${String(wrappedMinutes % 60).padStart(2, "0")}`,
    dayOffset: Math.floor(totalMinutes / 1440)
  };
}

function addDays(date: string, daysToAdd: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + daysToAdd);
  return parsed.toISOString().slice(0, 10);
}

function formatTimestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildDescription(event: BuildTripCalendarOptions["events"][number]) {
  const parts = [`TravelTogether ${event.event_type} event`];
  if (event.notes?.trim()) parts.push(event.notes.trim());

  const bookingUrl = event.metadata?.bookingUrl;
  if (typeof bookingUrl === "string" && bookingUrl.trim()) {
    parts.push(`Booking link: ${bookingUrl.trim()}`);
  }

  return parts.join("\n\n");
}

function buildEventLines(
  dayDate: string,
  event: BuildTripCalendarOptions["events"][number],
  timestamp: string
) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeText(`${event.id}@traveltogether.app`)}`,
    `DTSTAMP:${timestamp}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(buildDescription(event))}`
  ];

  const location = event.metadata?.location;
  if (typeof location === "string" && location.trim()) {
    lines.push(`LOCATION:${escapeText(location.trim())}`);
  }

  if (!event.start_time) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(dayDate)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(dayDate, 1))}`);
  } else {
    const startTime = event.start_time;
    const fallbackEnd = addMinutes(startTime, 60);
    const endTime = event.end_time || fallbackEnd.time;
    const endDayOffset =
      event.end_time && compactTime(endTime) <= compactTime(startTime) ? 1 : event.end_time ? 0 : fallbackEnd.dayOffset;

    lines.push(`DTSTART:${compactDate(dayDate)}T${compactTime(startTime)}`);
    lines.push(`DTEND:${compactDate(addDays(dayDate, endDayOffset))}T${compactTime(endTime)}`);
  }

  lines.push(`CATEGORIES:${event.event_type.toUpperCase()}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildTripCalendar({ trip, days, events, generatedAt = new Date() }: BuildTripCalendarOptions) {
  const datesByDayId = new Map(days.map((day) => [day.id, day.day_date]));
  const timestamp = formatTimestamp(generatedAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TravelTogether//Trip Itinerary//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(trip.title)}`,
    `X-WR-CALDESC:${escapeText(`${trip.title} · ${trip.destination}`)}`
  ];

  for (const event of events) {
    const dayDate = datesByDayId.get(event.day_id);
    if (!dayDate) {
      throw new Error("Every exported event must belong to a dated trip day.");
    }
    lines.push(...buildEventLines(dayDate, event, timestamp));
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function calendarFilename(title: string) {
  const safeTitle = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${safeTitle || "trip"}-calendar.ics`;
}
