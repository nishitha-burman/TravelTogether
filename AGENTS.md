# TravelTogether Agent Guide

This repository already has enough product and architecture context for an AI coding agent to make meaningful changes, but the most important details are spread across the codebase. Start here.

## Read First
- [`docs/PRODUCT_CONTEXT.md`](docs/PRODUCT_CONTEXT.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`README.md`](README.md)

## What This App Is
TravelTogether is a collaborative travel itinerary planner built with Next.js and Supabase. It supports authentication, private and public itineraries, invite-based sharing, map markers, and a day-by-day timeline.

## What Matters Most When Editing
- The app supports a `scaffold mode` when Supabase env vars are missing. Do not break that mode.
- Some code contains compatibility fallbacks for older Supabase schemas that may be missing newer columns such as `city`, `planning_mode`, `start_date`, `end_date`, or `day_date`.
- Read access is broader than write access. Shared/public trips can be viewed, but most mutation APIs are still owner-only.
- The visible product version in the header is manually rendered in `app/layout.tsx`. It is not derived from `package.json`.

## Change Checklist
- If you add or change data fields, update:
  - Supabase migrations
  - relevant API routes under `app/api/`
  - any affected TypeScript types
  - scaffold-mode fallbacks where needed
- If you change auth or sharing behavior, verify both:
  - server-rendered page access
  - client-side fetches that use `getAuthJsonHeaders()`
- If you change the trip detail experience, check all three surfaces:
  - owner/member trip page at `/trips/[id]`
  - public shared page at `/public/[slug]`
  - dashboard summary cards
- Run `npm run build` before finishing.

## Good Next Areas
- Real collaborator editing instead of owner-only writes
- Better optimistic UI instead of `window.location.reload()`
- Calendar export
- Real-time collaboration and change history
