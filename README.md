# TravelTogether

A shared travel itinerary, from the first idea to each traveler’s calendar.

Next.js App Router + React + TypeScript + Tailwind + Supabase. Owners invite editors or viewers; groups plan days, events and places, then assign dates and an explicit timezone and download a private calendar snapshot.

## Local setup

1. Use Node.js 22.12+ and run `npm ci`.
2. Copy `.env.example` to `.env.local` and set the Supabase URL/anon key. Leave those variables absent or empty for frontend scaffold mode.
3. Apply SQL migrations in order to a backed-up staging database, then production:
   - `supabase/migrations/001_init_triptogether.sql`
   - `supabase/migrations/002_itinerary_planning_and_editing.sql`
   - `supabase/migrations/003_private_collaboration.sql`
   - `supabase/migrations/004_calendar_ready_planning.sql`
   - `supabase/migrations/005_event_addition_order.sql`
   - `supabase/migrations/006_edit_trip_details.sql`
   - `supabase/migrations/007_account_profiles.sql`
   - `supabase/migrations/008_profile_photos_and_email.sql`
4. Enable Supabase Email Auth and configure the site/redirect URLs.
   Keep secure email-change confirmation enabled and allow `/auth/callback` on the app origin. Migration 008 enables private profile photos; email confirmation delivery needs working Supabase email configuration.
5. Run `npm run dev` and open the printed local URL.

**Apply 003 and 004 before deploying v1.4.** The privacy fix depends on database policies, not just the new UI. Old public pages are intentionally unavailable without the sanitized RPC. Day restructuring, invite acceptance and date assignment require the new transactional functions. Private legacy reads still have schema fallbacks. See [deployment notes](docs/ARCHITECTURE.md).

## What works

- Signed-in accounts own their created trips. Private profiles at `/profile` include editable display name, home city and bio, account email/join date, created/collaboration/past/upcoming trip counts, and upcoming trip links. Profile editing requires migration 007.

- Day-count or date-range trip creation; dates/timezone can be assigned later.
- Owners edit trip titles, duration or actual dates from the dashboard or trip header, and delete trips with confirmation. Shortening only removes empty trailing days; events on removed days block the change. Trip-detail editing requires migration 006.
- Owner/editor/viewer roles enforced in APIs and RLS. Owners manage invitations, membership, public links and deletion.
- Tabbed itinerary, weekly event calendar, saved places, and owner sharing; keyboard navigation and retained drafts.
- Timeline and saved-place editing without full-page reloads; pending/saved/error states and retained failed inputs.
- Dashboard roles, date grouping, update dates and calendar readiness.
- Sanitized public itineraries, with private booking data and traveler identities excluded at the database boundary.
- Timezone-correct `.ics` downloads with stable IDs, revisions, all-day and overnight events. Notes and booking details are excluded.
- Public cover images limited to JPG/PNG/WebP and 5 MB, with user-scoped upload/delete policies.

A downloaded calendar is a **one-time snapshot**. It does not update when the itinerary changes, and repeated imports may create duplicates. Subscriptions and Google/Microsoft connections are not implemented. [Calendar architecture and next release](docs/CALENDAR_DELIVERY_ADR.md).

Invitations do not send email; the invited traveler signs in with the confirmed matching email and opens Your trips to accept. Existing viewer invitations stay viewers.

## Scaffold preview

Run `npm run dev:preview` and open http://127.0.0.1:3100/dashboard. This command temporarily clears the Supabase variables without modifying `.env.local`.

The Honolulu example covers November 4–8, 2026 in `Pacific/Honolulu`, with the traveler's hotel, beach, food stops, Pearl Harbor/USS Arizona, and Saturday market/Diamond Head visits. Other day placements are tentative; no booking times or references are invented. Untimed entries display as all-day. Honolulu appears under **Past trips**; Kyoto remains an undated example. Older Lisbon preview URLs still render the current example.

With Supabase variables unset, browse `/`, `/dashboard`, `/trips/new`, `/trips/demo-honolulu`, `/trips/demo-kyoto`, and `/public/demo-honolulu`. `/profile` previews the account page with clearly marked example statistics. Sample trips use the real workspace, including owner/editor/viewer preview links. Saving, sign-in and downloads are disabled. External imagery/maps still need a network connection.

### What to try

1. Open Honolulu from **Past trips** and check the five dates, timezone, nine activities, and saved places.
2. Switch **Itinerary / Calendar / Saved places / Travelers & sharing** to view one section at a time. Calendar shows the week’s events, with download/date settings below. Then switch **Owner / Editor / Viewer** at the top. Owners see sharing controls; editors can explore event forms; viewers have no editing controls.
3. Open **Add event**, switch categories, inspect the optional booking fields, and cancel. The preview intentionally disables saving and calendar download.
4. Open `/public/demo-honolulu` to check the read-only view without group notes or booking details. Open Kyoto to see calendar readiness for an undated trip.
5. To test persistence, stop the preview server, complete the Supabase setup above against staging, and run `npm run dev`. Create a separate test trip, save and reload an event, invite confirmed editor/viewer accounts, and check their permissions. Download a calendar snapshot from the private trip and inspect the dates in your calendar app. Preview examples are not inserted into your database.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Tests cover calendar dates/timezones/DST/escaping/privacy, cookie/bearer route authorization, migration/RLS behavior and transactional day/invitation changes. Database tests run locally with PGlite, without production credentials. Live Supabase Auth/Storage and calendar-client import checks still require staging accounts; see [verification record](docs/RELEASE_VERIFICATION.md).

## Project guide

- [AGENTS.md](AGENTS.md)
- [Product context](docs/PRODUCT_CONTEXT.md)
- [Architecture and compatibility](docs/ARCHITECTURE.md)
- [Release audit and phased plan](docs/RELEASE_AUDIT.md)
- [Product backlog](docs/PRODUCT_BACKLOG.md)
- [Engineering backlog](docs/ENGINEERING_BACKLOG.md)

The visible v1.4 label is maintained manually in `app/layout.tsx`; it is not derived from package.json.

## Vercel

Import the repository, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL`, apply migrations, and deploy. Add the deployment origin to Supabase Auth’s allowed redirect URLs. Do not use the service-role key in browser configuration.
