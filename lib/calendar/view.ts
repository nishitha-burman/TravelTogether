import type { DayRow, EventRow } from "@/types/trip";

export type CalendarDay = Pick<
  DayRow,
  "id" | "day_number" | "label" | "day_date"
>;
export type CalendarEvent = Pick<
  EventRow,
  "id" | "day_id" | "title" | "event_type" | "start_time" | "end_time"
>;
type Cell = { key: string; date: string | null; days: CalendarDay[] };
export type CalendarPage = { dated: boolean; cells: Cell[] };

function addDate(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function calendarPages(days: CalendarDay[]): CalendarPage[] {
  const byDate = new Map<string, CalendarDay[]>();
  const undated: CalendarDay[] = [];
  for (const day of [...days].sort((a, b) => a.day_number - b.day_number)) {
    if (day.day_date)
      byDate.set(day.day_date, [...(byDate.get(day.day_date) ?? []), day]);
    else undated.push(day);
  }
  const dates = [...byDate.keys()].sort();
  const pages: CalendarPage[] = [];
  if (dates.length) {
    const weekday = new Date(`${dates[0]}T12:00:00Z`).getUTCDay();
    let monday = addDate(dates[0], -((weekday + 6) % 7));
    while (monday <= dates[dates.length - 1]) {
      pages.push({
        dated: true,
        cells: Array.from({ length: 7 }, (_, index) => {
          const date = addDate(monday, index);
          return { key: date, date, days: byDate.get(date) ?? [] };
        }),
      });
      monday = addDate(monday, 7);
    }
  }
  for (let index = 0; index < undated.length; index += 7) {
    pages.push({
      dated: false,
      cells: undated
        .slice(index, index + 7)
        .map((day) => ({ key: day.id, date: null, days: [day] })),
    });
  }
  return pages;
}

export function calendarEvents(events: CalendarEvent[], days: CalendarDay[]) {
  const ids = new Set(days.map((day) => day.id));
  // Stable sorting keeps the server's addition order for untimed entries.
  return events
    .filter((event) => ids.has(event.day_id))
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
}
