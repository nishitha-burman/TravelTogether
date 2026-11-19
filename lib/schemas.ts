import { z } from "zod";
import { EVENT_TYPES } from "@/types/trip";
import { isTimezone } from "@/lib/calendar/time";
export const timezoneSchema = z.string().refine(isTimezone, "Choose a valid IANA timezone");
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
