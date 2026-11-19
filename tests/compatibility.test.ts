import { expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readTrips, readTimeline } from "@/lib/server/trip-data";

type Result = { data: unknown[] | null; error: { code: string; message: string } | null };
const missing: Result = { data: null, error: { code: "42703", message: "column does not exist" } };
const failed: Result = { data: null, error: { code: "08006", message: "connection failure" } };
function client(responses: Record<string, Result[]>) {
  const selects = vi.fn();
  const supabase = {
    from(table: string) {
      const result = responses[table].shift();
      if (!result) throw new Error(`Unexpected extra query to ${table}`);
      const query = {
        select(fields: string) {
          selects(table, fields);
          return query;
        },
        in() {
          return query;
        },
        order() {
          return query;
        },
        then(resolve: (value: Result) => void) {
          resolve(result);
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { supabase, selects };
}
test("baseline trips preserve destination and safely default missing planning fields", async () => {
  const { supabase, selects } = client({
    itineraries: [missing, missing, { data: [{ id: "trip", destination: "Lisbon" }], error: null }],
  });
  expect(await readTrips(supabase, ["trip"])).toEqual([
    expect.objectContaining({
      city: "Lisbon",
      planning_mode: "days",
      start_date: null,
      end_date: null,
      timezone: null,
    }),
  ]);
  expect(selects).toHaveBeenCalledTimes(3);
});
test("pre-timezone schema retains existing dates", async () => {
  const { supabase, selects } = client({
    itineraries: [
      missing,
      {
        data: [
          {
            id: "trip",
            destination: "Lisbon",
            planning_mode: "date_range",
            start_date: "2026-12-04",
            end_date: "2026-12-06",
          },
        ],
        error: null,
      },
    ],
  });
  expect(await readTrips(supabase, ["trip"])).toEqual([
    expect.objectContaining({
      planning_mode: "date_range",
      start_date: "2026-12-04",
      end_date: "2026-12-06",
      timezone: null,
    }),
  ]);
  expect(selects).toHaveBeenCalledTimes(2);
});
test("legacy timeline retains private event content while defaulting missing dates and revisions", async () => {
  const { supabase } = client({
    trip_days: [missing, { data: [{ id: "day", day_number: 1 }], error: null }],
    itinerary_events: [
      missing,
      {
        data: [
          {
            id: "event",
            notes: "Group note",
            metadata: { location: "Alfama" },
            created_at: "2026-11-16T12:00:00Z",
          },
        ],
        error: null,
      },
    ],
  });
  const { days, events } = await readTimeline(supabase, ["trip"]);
  expect(days[0].day_date).toBeNull();
  expect(events[0]).toMatchObject({
    notes: "Group note",
    metadata: { location: "Alfama" },
    sequence: 0,
    updated_at: "2026-11-16T12:00:00Z",
  });
});
test("operational read errors surface instead of producing an empty trip or calendar", async () => {
  const trips = client({ itineraries: [failed] });
  await expect(readTrips(trips.supabase, ["trip"])).rejects.toThrow("Could not load trips");
  expect(trips.selects).toHaveBeenCalledTimes(1);
  const timeline = client({ trip_days: [{ data: [], error: null }], itinerary_events: [failed] });
  await expect(readTimeline(timeline.supabase, ["trip"])).rejects.toThrow("Could not load the timeline");
});
