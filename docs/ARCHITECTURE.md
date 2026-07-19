# Architecture

## Stack
- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Storage
- Google Maps iframe embeds for map rendering

## App Structure
- `app/layout.tsx`
  - global shell, header, auth-aware nav, visible manual version label
- `app/page.tsx`
  - marketing-style landing page
- `app/dashboard/page.tsx`
  - authenticated trip listing
  - auto-accepts pending invites for the current user's email
- `app/trips/new/page.tsx`
  - create itinerary flow
- `app/trips/[id]/page.tsx`
  - owner/member trip detail page
  - renders sharing, map, and timeline editors
- `app/public/[slug]/page.tsx`
  - public read-only trip page
- `app/api/**`
  - mutation and helper APIs for trips, days, events, markers, settings, members, auth, location search, and calendar export
- `app/api/trips/[id]/calendar/route.ts`
  - authenticated read route that generates a downloadable `.ics` file
  - relies on Supabase RLS so owners and accepted members with trip read access can export
  - returns `422` when the timeline is empty, an event day has no date, or the legacy schema lacks `day_date`
- `lib/components/**`
  - client components for forms and editors
- `lib/calendar/ics.ts`
  - pure iCalendar serialization and filename helpers
  - escapes text, folds long UTF-8 lines, assigns stable event UIDs, and maps timed/all-day events
- `lib/**`
  - auth helpers, Supabase client setup, trip access helpers
- `supabase/migrations/**`
  - schema and incremental evolution

## Data Model
Main tables from the Supabase migrations:
- `profiles`
- `itineraries`
- `itinerary_members`
- `itinerary_invites`
- `trip_days`
- `itinerary_events`
- `itinerary_markers`

Later schema additions include:
- `itineraries.city`
- `itineraries.planning_mode`
- `itineraries.start_date`
- `itineraries.end_date`
- `trip_days.day_date`

## Auth and Access Model
- `lib/supabase-server.ts` creates the server-side Supabase client using cookies.
- `lib/supabase-client.ts` creates the browser client.
- `lib/api-auth.ts`
  - accepts either a bearer token or cookie-backed session
  - provides `getAuthedUser()`
  - provides `requireTripOwner()`
- `lib/trips.ts`
  - redirects unauthenticated users
  - auto-accepts pending invites on dashboard load

Important behavior:
- Read access is broader than write access due to RLS plus public trip support.
- Most mutation routes still call `requireTripOwner()`, so only owners can edit timeline data, markers, sharing settings, and similar resources today.

## Notable UI Components
- `lib/components/create-trip-form.tsx`
  - supports day-count and date-range planning modes
  - supports destination autocomplete
  - supports file upload to Supabase Storage bucket `trip-images`
- `lib/components/map-editor.tsx`
  - embeds Google Maps using a destination or selected place query
  - exposes Google Maps points of interest such as restaurants and shops
  - adds markers through location search and the trip markers API
- `lib/components/timeline-editor.tsx`
  - supports full and condensed views
  - supports adding, editing, and deleting days and events
  - event metadata varies by event type
- `lib/components/sharing-settings.tsx`
  - toggles public/private status
  - creates private email invites
- `lib/components/calendar-export.tsx`
  - renders the trip-level `.ics` download action
  - explains empty-timeline, undated-trip, and scaffold-mode limitations

## Calendar Export

Calendar export is a one-time, server-generated `.ics` download:

- Route: `GET /api/trips/[id]/calendar`
- Content type: `text/calendar; charset=utf-8`
- Cache policy: `private, no-store`
- Access: authenticated users who can read the trip through existing RLS
- Availability: timelines with at least one event where every event's `trip_days` row has `day_date`

Event mapping:

- `title` → `SUMMARY`
- `day_date` plus `start_time`/`end_time` → `DTSTART`/`DTEND`
- no `start_time` → one-day all-day event
- `start_time` without `end_time` → one-hour duration
- an end time not later than the start time → following day
- `metadata.location` → `LOCATION`
- `notes` and `metadata.bookingUrl` → `DESCRIPTION`
- event type → `CATEGORIES`
- TravelTogether event ID → stable iCalendar `UID`

The serializer deliberately omits confirmation codes, ticket references, transport details, and other unapproved metadata. Times are floating local date-times because the current schema has no trip timezone. Direct Google Calendar OAuth/API integration, calendar subscriptions, public export, and two-way synchronization are separate future features.

## Compatibility Patterns
The code intentionally contains fallback logic for older schemas. Examples:
- trip queries may retry without newer itinerary columns
- `trip_days` queries may retry without `day_date`
- itinerary creation may retry without newer columns

Do not remove these fallbacks casually unless the deployment strategy has been updated and the older schema path is no longer needed.

## Scaffold Mode
When Supabase env vars are missing:
- pages still render with demo or placeholder data
- auth and persistence are intentionally disabled
- calendar export renders a disabled action with an explanatory message
- this is used for frontend iteration without a live backend

Any feature work should preserve this mode unless the team explicitly decides to remove it.

## Operational Notes
- Build command: `npm run build`
- Dev command: `npm run dev`
- The visible app version is currently maintained manually in `app/layout.tsx`.
- `package.json` version and visible product version can diverge.

## Change Guidance
When changing behavior, keep the following in sync:
- database schema
- API routes
- page-level server data fetching
- client component assumptions
- public-page and scaffold-mode behavior
