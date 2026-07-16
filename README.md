# TravelTogether

TravelTogether is a Next.js + Supabase app for collaborative travel planning.

## Agent context docs
- `AGENTS.md` - starting point for AI coding agents
- `docs/PRODUCT_CONTEXT.md` - product goals, user journeys, limitations
- `docs/ARCHITECTURE.md` - codebase structure, data model, auth and implementation notes

## Core functionality implemented
- Email/password sign up and login with Supabase Auth
- Auth-protected dashboard with shared/private trip access
- Create itineraries with:
  - destination
  - themed image URL or uploaded image (Supabase Storage bucket `trip-images`)
  - trip length (days)
  - private/public visibility
- Private trips shared by invite email
- Public trips viewable by link (`/public/[slug]`)
- Interactive map markers (OpenStreetMap + Leaflet)
- Flexible timeline:
  - day-by-day structure
  - add extra days
  - event types (`stay`, `museum`, `travel`, `food`, `activity`, `custom`)
  - event-type custom fields (stored as JSON metadata)
  - full vs condensed trip length views

## Stack
- Next.js App Router (TypeScript)
- Supabase Auth, Postgres (RLS), Storage
- Tailwind CSS
- React Leaflet

## Local setup
1. Install Node.js 20+
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy env vars:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in Supabase values in `.env.local`
5. Run DB migration in Supabase SQL editor:
   - `supabase/migrations/001_init_triptogether.sql`
6. Start dev server:
   ```bash
   npm run dev
   ```

### If dashboard shows "Could not find table public.itineraries"
- This means your app is connected to Supabase Auth, but your database schema migration has not been applied in that project yet.
- In Supabase Dashboard, open SQL Editor and run:
  - `supabase/migrations/001_init_triptogether.sql`
- Refresh the app after it finishes.
- To verify setup, run this query in SQL Editor:
  ```sql
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'profiles',
      'itineraries',
      'itinerary_members',
      'itinerary_invites',
      'trip_days',
      'itinerary_events',
      'itinerary_markers'
    )
  order by table_name;
  ```

### Frontend scaffold mode (no Supabase yet)
- If you do not set Supabase env vars, the app now runs in scaffold mode.
- You can browse the frontend (`/`, `/dashboard`, `/trips/new`, `/trips/[id]`, `/public/[slug]`) with mock content.
- Auth and persistence actions are intentionally disabled until Supabase is configured.

## Supabase notes
- Ensure Email auth provider is enabled.
- Storage bucket `trip-images` is created by the migration.
- RLS policies are included for all core tables.

## Future phases (planned)
- Google Calendar export for itinerary events
- Apple Calendar export (`.ics`)
- Photo uploads with per-user/per-trip limits and moderation workflow
- Better real-time collaboration and change history

## Deploy on Vercel
1. Push repo to GitHub.
2. Import project in Vercel.
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your Vercel domain)
4. Deploy.
5. In Supabase Auth settings, add your Vercel URL to redirect URLs.

## Current constraints in this workspace
Node.js/npm are not installed in this environment, so install/build/test commands were not executed here.
