import { test, beforeAll as before, afterAll as after } from "vitest";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  editor = "22222222-2222-4222-8222-222222222222",
  viewer = "33333333-3333-4333-8333-333333333333",
  outsider = "44444444-4444-4444-8444-444444444444";
let trip: string, day: string, event: string;
async function asUser(id: string | null) {
  await db.exec(
    `reset role; set role ${id ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub','${id ?? ""}',false);`,
  );
}
async function scalar(sql: string, params: unknown[] = []) {
  return Object.values((await db.query<Record<string, unknown>>(sql, params)).rows[0])[0];
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    grant usage on schema public,auth,storage to anon,authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated;
    grant all on storage.objects to authenticated;
  `);
  for (const name of [
    "001_init_triptogether.sql",
    "002_itinerary_planning_and_editing.sql",
    "003_private_collaboration.sql",
    "004_calendar_ready_planning.sql",
  ]) {
    const sql = (await readFile(`supabase/migrations/${name}`, "utf8")).replace(
      'create extension if not exists "pgcrypto";',
      "",
    );
    await db.exec(sql);
  }
  await db.query(
    "insert into auth.users values ($1,'owner@example.test',now()),($2,'editor@example.test',now()),($3,'viewer@example.test',now()),($4,'outsider@example.test',now())",
    [owner, editor, viewer, outsider],
  );
  await asUser(owner);
  trip = (await scalar(
    "select public.create_trip_plan('Lisbon','Lisbon',3,'2026-12-01','Europe/Lisbon',true,null)",
  )) as string;
  day = (await scalar("select id from trip_days where itinerary_id=$1 order by day_number limit 1", [
    trip,
  ])) as string;
  event = (await scalar(
    "insert into itinerary_events(itinerary_id,day_id,title,event_type,notes,metadata) values($1,$2,'Museum','museum','SECRET NOTE','{\"confirmationCode\":\"SECRET CODE\",\"bookingUrl\":\"SECRET LINK\"}') returning id",
    [trip, day],
  )) as string;
  await db.query(
    "insert into itinerary_members(itinerary_id,user_id,role) values($1,$2,'editor'),($1,$3,'viewer')",
    [trip, editor, viewer],
  );
});
after(() => db.close());
test("anonymous and unrelated users cannot read raw public-trip data; RPC is sanitized", async () => {
  await asUser(owner);
  const slug = await scalar("select public_slug from itineraries where id=$1", [trip]);
  for (const user of [null, outsider]) {
    await asUser(user);
    for (const table of [
      "itineraries",
      "trip_days",
      "itinerary_events",
      "itinerary_members",
      "itinerary_markers",
    ])
      assert.equal(await scalar(`select count(*)::int from ${table}`), 0, table);
    const publicData = await scalar("select get_public_itinerary($1)", [slug]);
    const json = JSON.stringify(publicData);
    assert.match(json, /Museum/);
    assert.doesNotMatch(json, /SECRET|metadata|notes|owner_id|user_id|bookingUrl/);
    assert.equal(await scalar("select get_public_itinerary('unknown')"), null);
  }
});
test("private visibility revokes public projection for every caller", async () => {
  await asUser(owner);
  const slug = await scalar("select public_slug from itineraries where id=$1", [trip]);
  await db.query("update itineraries set is_public=false where id=$1", [trip]);
  assert.equal(await scalar("select get_public_itinerary($1)", [slug]), null);
  await db.query("update itineraries set is_public=true where id=$1", [trip]);
});
test("editor edits content; viewer reads private notes but cannot mutate or manage sharing", async () => {
  await asUser(editor);
  await db.query("update itinerary_events set title='Edited museum' where id=$1", [event]);
  assert.equal(await scalar("select sequence from itinerary_events where id=$1", [event]), 1);
  assert.equal(
    (await db.query("update itineraries set is_public=false where id=$1 returning id", [trip])).rows.length,
    0,
  );
  await assert.rejects(db.query("select trip_collaborators($1)", [trip]));
  await asUser(viewer);
  assert.equal(await scalar("select notes from itinerary_events where id=$1", [event]), "SECRET NOTE");
  assert.equal(
    (await db.query("update itinerary_events set title='No' where id=$1 returning id", [event])).rows.length,
    0,
  );
  await assert.rejects(db.query("select append_trip_day($1,'no')", [trip]));
  assert.equal(await scalar("select count(*)::int from itinerary_members"), 1);
});
test("membership removal immediately revokes raw reads and editing", async () => {
  await asUser(owner);
  await db.query("delete from itinerary_members where itinerary_id=$1 and user_id=$2", [trip, editor]);
  await asUser(editor);
  assert.equal(await scalar("select count(*)::int from itinerary_events"), 0);
  await assert.rejects(db.query("select append_trip_day($1,null)", [trip]));
  await asUser(owner);
  await db.query("insert into itinerary_members values($1,$2,'editor',now())", [trip, editor]);
});
test("cross-trip day IDs fail at the database boundary", async () => {
  await asUser(owner);
  const other = await scalar("select create_trip_plan('Other','Kyoto',1)");
  const otherDay = await scalar("select id from trip_days where itinerary_id=$1", [other]);
  await assert.rejects(
    db.query(
      "insert into itinerary_events(itinerary_id,day_id,title,event_type) values($1,$2,'Bad','custom')",
      [trip, otherDay],
    ),
  );
});
test("date assignment is atomic, versions events, and validates timezone", async () => {
  await asUser(editor);
  const before = (await scalar("select sequence from itinerary_events where id=$1", [event])) as number;
  await db.query("select assign_trip_dates($1,'2027-01-01','Asia/Tokyo')", [trip]);
  assert.equal(await scalar("select day_date::text from trip_days where id=$1", [day]), "2027-01-01");
  assert.ok(
    ((await scalar("select sequence from itinerary_events where id=$1", [event])) as number) > before,
  );
  await assert.rejects(db.query("select assign_trip_dates($1,'2028-01-01','Imaginary/Timezone')", [trip]));
  assert.equal(await scalar("select day_date::text from trip_days where id=$1", [day]), "2027-01-01");
});
test("day deletion resequences safely without shifting dates, then append advances the last date", async () => {
  await asUser(editor);
  const middle = await scalar("select id from trip_days where itinerary_id=$1 and day_number=2", [trip]);
  await db.query("select delete_trip_day($1,$2)", [trip, middle]);
  assert.deepEqual(
    (
      await db.query(
        "select day_number,day_date::text as date from trip_days where itinerary_id=$1 order by day_number",
        [trip],
      )
    ).rows,
    [
      { day_number: 1, date: "2027-01-01" },
      { day_number: 2, date: "2027-01-03" },
    ],
  );
  const appended = await scalar("select append_trip_day($1,'Extra')", [trip]);
  assert.equal(await scalar("select day_date::text from trip_days where id=$1", [appended]), "2027-01-04");
  assert.equal(await scalar("select trip_length_days from itineraries where id=$1", [trip]), 3);
  await db.query("select delete_trip_day($1,$2)", [trip, day]);
  assert.equal(await scalar("select count(*)::int from itinerary_events where id=$1", [event]), 0);
});
test("invite acceptance uses confirmed account email, honors role, and is idempotent", async () => {
  await asUser(owner);
  await db.query(
    "insert into itinerary_invites(itinerary_id,invited_email,invited_by,role) values($1,'OUTSIDER@example.test',$2,'editor')",
    [trip, owner],
  );
  await asUser(viewer);
  assert.equal(await scalar("select accept_pending_invites()"), 0);
  await asUser(outsider);
  assert.equal(await scalar("select accept_pending_invites()"), 1);
  assert.equal(await scalar("select accept_pending_invites()"), 0);
  assert.equal(
    await scalar("select role from itinerary_members where itinerary_id=$1 and user_id=$2", [trip, outsider]),
    "editor",
  );
});
test("storage writes are user scoped", async () => {
  await asUser(owner);
  await db.query("insert into storage.objects(bucket_id,name) values('trip-images',$1)", [
    `${owner}/cover.jpg`,
  ]);
  await assert.rejects(
    db.query("insert into storage.objects(bucket_id,name) values('trip-images',$1)", [`${editor}/cover.jpg`]),
  );
});
