import { beforeEach, test, expect, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthedUser } from "@/lib/api-auth";
import { readTrips, readTimeline } from "@/lib/server/trip-data";
import { POST as addEvent } from "@/app/api/trips/[id]/events/route";
import { PATCH as settings } from "@/app/api/trips/[id]/settings/route";
import { PATCH as schedule } from "@/app/api/trips/[id]/schedule/route";
import { GET as download } from "@/app/api/trips/[id]/calendar/route";
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/server/trip-data", () => ({ readTrips: vi.fn(), readTimeline: vi.fn() }));
const owner = "11111111-1111-4111-8111-111111111111",
  member = "22222222-2222-4222-8222-222222222222",
  tripId = "33333333-3333-4333-8333-333333333333",
  dayId = "44444444-4444-4444-8444-444444444444";
const context = { params: Promise.resolve({ id: tripId }) };
let role: "owner" | "editor" | "viewer" | null = "owner",
  signedIn = true,
  validDay = true;
const writes = vi.fn(),
  rpc = vi.fn(),
  filters = vi.fn();
function fakeClient() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: signedIn ? { id: role === "owner" ? owner : member } : null },
        error: signedIn ? null : new Error("Unauthorized"),
      })),
    },
    rpc,
    from(table: string) {
      let ownerFilter = false;
      const result = () => ({
        data:
          table === "itineraries"
            ? ownerFilter && role !== "owner"
              ? null
              : { id: tripId, owner_id: owner }
            : table === "itinerary_members"
              ? role
                ? { role }
                : null
              : table === "trip_days"
                ? validDay
                  ? { id: dayId }
                  : null
                : { id: "event" },
        error: null,
      });
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((...args: unknown[]) => {
          filters(table, ...args);
          if (args[0] === "owner_id") ownerFilter = true;
          return query;
        }),
        single: vi.fn(async () => result()),
        maybeSingle: vi.fn(async () => result()),
        insert: vi.fn((row: unknown) => {
          writes(table, row);
          return Promise.resolve({ error: null });
        }),
        update: vi.fn((row: unknown) => {
          writes(table, row);
          return query;
        }),
        then(resolve: (result: unknown) => void) {
          resolve({ error: null, data: { id: "event" } });
        },
      };
      return query;
    },
  };
}
const request = (body: unknown, method = "POST", bearer = true) =>
  new Request("http://localhost/api", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: "Bearer test-token" } : {}),
    },
    body: JSON.stringify(body),
  });
const payload = { dayId, title: "Dinner", eventType: "food", startTime: "19:00", endTime: "20:00" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  role = "owner";
  signedIn = true;
  validDay = true;
  const client = fakeClient();
  vi.mocked(createClient).mockReturnValue(client as unknown as ReturnType<typeof createClient>);
  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
  );
  rpc.mockResolvedValue({ data: null, error: null });
});
test("unauthenticated bearer request returns 401 without writes or cookie fallback", async () => {
  signedIn = false;
  const response = await addEvent(request(payload), context);
  expect(response?.status).toBe(401);
  expect(writes).not.toHaveBeenCalled();
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});
test("cookie-backed editor mutations use the same permission rules", async () => {
  role = "editor";
  expect((await addEvent(request(payload, "POST", false), context))?.status).toBe(201);
  expect(createSupabaseServerClient).toHaveBeenCalled();
  expect(writes).toHaveBeenCalledWith(
    "itinerary_events",
    expect.objectContaining({ itinerary_id: tripId, day_id: dayId }),
  );
});
test("owner and editor bearer writes succeed; viewer and unrelated user get 403", async () => {
  for (const candidate of ["owner", "editor", "viewer", null] as const) {
    role = candidate;
    writes.mockClear();
    expect((await addEvent(request(payload), context))?.status).toBe(
      candidate === "owner" || candidate === "editor" ? 201 : 403,
    );
    if (candidate === "viewer" || candidate === null) expect(writes).not.toHaveBeenCalled();
  }
  expect(createClient).toHaveBeenCalledWith(
    "https://test.supabase.co",
    "test-anon-key",
    expect.objectContaining({ global: { headers: { Authorization: "Bearer test-token" } } }),
  );
});
test("sharing is owner-only even for editors", async () => {
  role = "editor";
  expect((await settings(request({ isPublic: true }, "PATCH"), context))?.status).toBe(403);
  expect(writes).not.toHaveBeenCalled();
  role = "owner";
  expect((await settings(request({ isPublic: true }, "PATCH"), context))?.status).toBe(200);
});
test("malformed JSON, invalid times and cross-trip day fail without writes", async () => {
  const malformed = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
    body: "{",
  });
  expect((await addEvent(malformed, context))?.status).toBe(400);
  expect((await addEvent(request({ ...payload, startTime: "25:00" }), context))?.status).toBe(400);
  expect((await addEvent(request({ ...payload, startTime: null }), context))?.status).toBe(400);
  validDay = false;
  expect((await addEvent(request(payload), context))?.status).toBe(400);
  expect(writes).not.toHaveBeenCalled();
  expect(filters).toHaveBeenCalledWith("trip_days", "itinerary_id", tripId);
});
test("schedule is editor-aware, rejects invalid timezone, and fails clearly when RPC is missing", async () => {
  role = "editor";
  expect(
    (await schedule(request({ startDate: "2026-12-01", timezone: "Europe/Lisbon" }, "PATCH"), context))
      ?.status,
  ).toBe(200);
  expect(rpc).toHaveBeenCalledWith("assign_trip_dates", {
    target_id: tripId,
    first_date: "2026-12-01",
    trip_timezone: "Europe/Lisbon",
  });
  expect(
    (await schedule(request({ startDate: "2026-12-01", timezone: "Unknown/Here" }, "PATCH"), context))
      ?.status,
  ).toBe(400);
  rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
  expect(
    (await schedule(request({ startDate: "2026-12-01", timezone: "UTC" }, "PATCH"), context))?.status,
  ).toBe(503);
});
test("calendar permits viewer, denies public non-members, and checks readiness", async () => {
  vi.mocked(readTrips).mockResolvedValue([
    { title: "Trip", destination: "Lisbon", timezone: "Europe/Lisbon" },
  ] as never);
  vi.mocked(readTimeline).mockResolvedValue({
    days: [{ id: dayId, day_date: "2026-12-01" }],
    events: [
      {
        id: "event",
        day_id: dayId,
        title: "Walk",
        event_type: "activity",
        start_time: "10:00",
        end_time: null,
        metadata: {},
        notes: "PRIVATE",
      },
    ],
  } as never);
  role = "viewer";
  const response = await download(
    new Request("http://localhost", { headers: { Authorization: "Bearer test-token" } }),
    context,
  );
  expect(response?.status).toBe(200);
  expect(response?.headers.get("cache-control")).toBe("private, no-store");
  expect(await response?.text()).not.toContain("PRIVATE");
  role = null;
  expect((await download(new Request("http://localhost"), context))?.status).toBe(403);
  role = "viewer";
  vi.mocked(readTrips).mockResolvedValue([{ title: "Trip", timezone: null }] as never);
  expect((await download(new Request("http://localhost"), context))?.status).toBe(422);
});
test("scaffold authentication returns 503 before creating any client", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  const auth = await getAuthedUser();
  expect(auth.error?.status).toBe(503);
  expect(createClient).not.toHaveBeenCalled();
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});
