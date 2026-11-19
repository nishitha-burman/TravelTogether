import { Temporal } from "@js-temporal/polyfill";
import { eventInstants, isTimezone } from "@/lib/calendar/time";
export type CalendarDay = { id: string; day_date: string | null };
export type CalendarEvent = {
  id: string;
  day_id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
};
export function calendarReadiness(
  timezone: string | null | undefined,
  days: CalendarDay[],
  events: CalendarEvent[],
) {
  const issues: string[] = [];
  if (!events.length) issues.push("Add at least one event to your itinerary.");
  if (!isTimezone(timezone)) issues.push("Choose the trip timezone.");
  const dates = new Map(days.map((d) => [d.id, d.day_date]));
  let undated = 0;
  for (const event of events) {
    const date = dates.get(event.day_id);
    if (!date) {
      undated++;
      continue;
    }
    try {
      Temporal.PlainDate.from(date);
      if (!event.start_time && event.end_time) throw new Error("An end needs a start");
      if (event.start_time && isTimezone(timezone))
        eventInstants(date, event.start_time, event.end_time, timezone);
    } catch {
      issues.push(
        `Check the date and time for “${event.title}”. It may fall in a daylight-saving clock change.`,
      );
    }
  }
  if (undated)
    issues.push(
      `Assign dates to ${undated === 1 ? "the day with an event" : `days containing ${undated} events`}.`,
    );
  return { ready: issues.length === 0, issues, eventCount: events.length };
}
