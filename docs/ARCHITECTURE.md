# Architecture

## Stack
- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Storage
- React Leaflet for map rendering

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
  - mutation and helper APIs for trips, days, events, markers, settings, members, auth, and location search
- `lib/components/**`
  - client components for forms and editors
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
  - uses Leaflet and OpenStreetMap tiles
  - centers on destination lookup or first marker
  - adds markers through the trip markers API
- `lib/components/timeline-editor.tsx`
  - supports full and condensed views
  - supports adding, editing, and deleting days and events
  - event metadata varies by event type
- `lib/components/sharing-settings.tsx`
  - toggles public/private status
  - creates private email invites

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
