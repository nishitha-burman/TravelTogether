# Architecture

## Stack and entry points

Next.js 15 App Router, React 19, TypeScript, Tailwind and Supabase (Auth/Postgres/Storage). Maps use Google iframe embeds. Temporal handles calendar timezone conversion.

- `app/layout.tsx`: shared shell, manual v1.4 label, skip link and navigation.
- `app/dashboard/page.tsx`: invite acceptance, owner/member trip list, role/readiness/date grouping.
- `app/trips/[id]/page.tsx`: explicit membership check, shared private repository, role-aware workspace.
- `app/public/[slug]/page.tsx`: sanitized public RPC only; dynamic and fail-closed.
- `lib/server/trip-data.ts`: private trip/timeline/place reads and legacy column fallbacks. Child-query failures are surfaced rather than silently empty.
- `lib/components/timeline-editor.tsx`, `event-form.tsx`, `use-trip-mutation.ts`: progressive forms, safe pending state, retained input on error, `router.refresh()` after success.
- `lib/components/calendar-export.tsx`: readiness, transactional date/timezone assignment, authenticated download with visible errors.
- `lib/calendar/{time,readiness,ics}.ts`: shared readiness, UTC conversion, escaping/folding and revision-aware snapshots.

## Authorization

`lib/api-auth.ts` accepts bearer or cookie authentication. `getTripRole` explicitly checks ownership/membership and never treats public visibility as private access. `requireTripEditor` permits owner/editor content changes. `requireTripOwner` guards sharing, invitations, roles and trip deletion. Unauthenticated API requests get 401; authenticated requests without permission get 403. Clients use `getAuthJsonHeaders()`.

| Action | Owner | Editor | Viewer | Public |
| --- | --- | --- | --- | --- |
| Private itinerary / calendar snapshot | Yes | Yes | Yes | No |
| Days, events, places, date assignment | Yes | Yes | No | No |
| Visibility, invites, member roles, delete trip | Yes | No | No | No |
| Sanitized public RPC | Public trips only | Public trips only | Public trips only | Public trips only |

Migration 003 changes `can_access_itinerary` to private membership only, restricts member reads to self/owner, enables editor content policies, enforces same-trip event/day references, and provides atomic invite acceptance and owner-only collaborator listing. The owner can see collaborator emails through the dedicated RPC; raw profiles remain self-only.

Migration 004 adds timezone, event `updated_at`/`sequence`, revision/touch triggers, transactional create/append/delete/date-assignment RPCs and the public allowlist RPC. Security-definer functions use empty search paths, qualified relations, explicit caller checks and execute grants. Child writes update the trip’s update timestamp.

## Calendar

`GET /api/trips/[id]/calendar` checks private membership and shared readiness, then serves `text/calendar` with `private, no-store`. Timezone is required even for an all-day-only plan, making the readiness contract consistent. Timed events become UTC instants; all-day dates are timezone-independent. End <= start is overnight; no end means one elapsed hour. Clock-change ambiguities block export.

Stable UID derives from event UUID. SEQUENCE/LAST-MODIFIED come from database revision fields. Deletion removes entries from future snapshots and cannot change previously imported files. Notes and booking data never leave through calendar/public projections. See [calendar ADR](CALENDAR_DELIVERY_ADR.md) for subscription/provider boundaries and the next implementation plan.

## Compatibility and deployment

Run migrations 001 → 002 → 003 → 004 before deploying v1.4. New security policies are a deployment prerequisite: application code alone cannot fix anonymous access through an unmigrated Supabase API.

Private trip reads retry without timezone, then without city/planning/date columns. Day reads retry without `day_date`; event reads retry without version columns. Legacy rows without timezone remain not ready for export. Legacy undated creation retains its fallback with explicit day failure handling and compensating trip cleanup. If a timezone was supplied, creation never silently discards it.

Unsafe multi-write day append/delete and invite acceptance are deliberately replaced by atomic RPCs: pre-004/pre-003 deployments receive a controlled unavailable response rather than an unsafe write. This is the documented migration prerequisite for retiring those mutation paths. Public reads have no raw-table fallback under any schema.

Migration 003 rejects existing cross-trip event/day references with a diagnostic; investigate and repair rather than deleting user data. Apply the two new migrations in order during the same release window. Back up first, run the local tests, and use a staging Supabase project for auth/storage/network integration before production. Roll back application code only if it understands private RLS; do not restore broad anonymous policies. Prefer a forward fix for migration errors.

## Cover images

The bucket remains public by design: cover art must not contain private documents. New object paths start with the authenticated user ID because upload precedes trip creation. Inserts/deletes are restricted to that prefix; MIME types are JPG/PNG/WebP and the bucket limit is 5 MB. Confirmed creation failures clean up new uploads. Ambiguous network failures can leave orphan images; lifecycle cleanup and private signed-URL media remain backlog items. Existing remote HTTPS image URLs remain supported.

## Verification

`npm test` runs Vitest, pure calendar/validation tests, mocked route auth/authorization tests and PGlite PostgreSQL migration/RLS/transaction tests. The harness supplies minimal Auth/Storage schemas and replaces only unavailable pgcrypto extension creation (core UUID generation remains). It does not emulate Supabase’s HTTP storage MIME enforcement, live cookie refresh, or multi-connection concurrency. `npm run lint`, `npm run typecheck` and `npm run build` are release checks. Scaffold browser QA covers the same page/components but cannot verify persisted authenticated writes.
