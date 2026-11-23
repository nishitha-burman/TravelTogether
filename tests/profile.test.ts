import { expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountTripStats } from "@/lib/profile";
import { readProfile } from "@/lib/server/profile-data";
import { demoTrip } from "@/lib/demo";

test("account statistics deduplicate owned memberships and separate past, active and open dates", () => {
  const owned = { ...demoTrip().trip, owner_id: "me" };
  const joined = {
    ...owned,
    id: "joined",
    owner_id: "someone-else",
    start_date: "2026-11-23",
    end_date: "2026-11-25",
  };
  const open = { ...demoTrip("demo-kyoto").trip, owner_id: "someone-else" };
  const endingToday = { ...joined, id: "ending-today", end_date: "2026-11-23" };
  expect(
    accountTripStats(
      [owned, owned, joined, open, endingToday],
      "me",
      "2026-11-23",
    ),
  ).toEqual({
    total: 4,
    created: 1,
    collaborations: 3,
    past: 1,
    upcoming: 2,
    datesOpen: 1,
  });
  expect(accountTripStats([], "me", "2026-11-23")).toEqual({
    total: 0,
    created: 0,
    collaborations: 0,
    past: 0,
    upcoming: 0,
    datesOpen: 0,
  });
});

function profileClient(results: unknown[]) {
  const filters = vi.fn();
  const client = {
    from() {
      const result = results.shift();
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          filters(...args);
          return query;
        },
        maybeSingle: async () => result,
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, filters };
}

test("old profile schemas preserve the account and disable new-field editing", async () => {
  const { client, filters } = profileClient([
    { data: null, error: { code: "42703", message: "column does not exist" } },
    { data: { id: "me", created_at: "2026-11-01T12:00:00Z" }, error: null },
  ]);
  expect(await readProfile(client, "me")).toEqual({
    profile: {
      id: "me",
      created_at: "2026-11-01T12:00:00Z",
      display_name: null,
      home_city: null,
      bio: null,
    },
    editable: false,
  });
  expect(filters).toHaveBeenCalledWith("id", "me");
  expect(filters).toHaveBeenCalledTimes(2);
});

test("profile read failures surface instead of pretending the account is empty", async () => {
  const { client } = profileClient([
    { data: null, error: { code: "08006", message: "connection failure" } },
  ]);
  await expect(readProfile(client, "me")).rejects.toThrow(
    "Could not load your profile",
  );
});
