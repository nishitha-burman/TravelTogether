import { z } from "zod";
import { EVENT_TYPES } from "@/types/trip";
import { isTimezone } from "@/lib/calendar/time";
export const timezoneSchema = z.string().refine(isTimezone, "Choose a valid IANA timezone");
export const profileSchema = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  homeCity: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Choose a profile field to update.");
export function dateRangeDays(start: string, end: string) {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}
export const tripDetailsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  planningMode: z.enum(["days", "date_range"]).optional(),
  tripLengthDays: z.number().int().min(1).max(120).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  timezone: timezoneSchema.nullable().optional(),
}).strict().superRefine((value, context) => {
  let message: string | null = null;
  if (!value.planningMode && Object.keys(value).some((key) => key !== "title"))
    message = "Choose a planning mode when changing dates or trip length.";
  if (value.planningMode === "days" && (!value.tripLengthDays || value.startDate || value.endDate))
    message = "Choose a trip length between 1 and 120 days.";
  if (value.planningMode === "date_range") {
    const count = value.startDate && value.endDate ? dateRangeDays(value.startDate, value.endDate) : NaN;
    if (!Number.isFinite(count) || count < 1 || count > 120 || value.tripLengthDays !== undefined)
      message = "Choose a date range between 1 and 120 days.";
  }
  if (message) context.addIssue({ code: "custom", message });
});
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  .nullable()
  .optional();
export const eventSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    eventType: z.enum(EVENT_TYPES),
    startTime: timeSchema,
    endTime: timeSchema,
    notes: z.string().max(10000).optional(),
    metadata: z
      .record(z.string().max(80), z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]))
      .optional(),
  })
  .strict();
export const createEventSchema = eventSchema.extend({ dayId: z.string().uuid() });
export function validEventTimes(event: { startTime?: string | null; endTime?: string | null }) {
  return !event.endTime || Boolean(event.startTime);
}
