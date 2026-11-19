import { Temporal } from "@js-temporal/polyfill";
export function isTimezone(value: string | null | undefined): value is string {
  if (!value || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export function eventInstants(date: string, start: string, end: string | null, timezone: string) {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(start) || (end && !/^\d{2}:\d{2}(:\d{2})?$/.test(end)))
    throw new Error("Invalid time");
  const day = Temporal.PlainDate.from(date);
  const startTime = Temporal.PlainTime.from(start);
  const startAt = day.toPlainDateTime(startTime).toZonedDateTime(timezone, { disambiguation: "reject" });
  if (!end) return { start: startAt.toInstant(), end: startAt.add({ hours: 1 }).toInstant() };
  const endTime = Temporal.PlainTime.from(end);
  const endDay = Temporal.PlainTime.compare(endTime, startTime) <= 0 ? day.add({ days: 1 }) : day;
  const endAt = endDay.toPlainDateTime(endTime).toZonedDateTime(timezone, { disambiguation: "reject" });
  return { start: startAt.toInstant(), end: endAt.toInstant() };
}
export function dateLabel(date: string | null | undefined) {
  if (!date) return "Dates open";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
