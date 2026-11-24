# Architecture

## Stack and entry points

Next.js 15 App Router, React 19, TypeScript, Tailwind and Supabase (Auth/Postgres/Storage). Maps use Google iframe embeds. Temporal handles calendar timezone conversion.

- `app/layout.tsx`: shared shell, manual product version, skip link and navigation.
- `app/profile/page.tsx` and `app/settings/account/page.tsx`: authenticated traveler summary/private statistics and separate private account details/email editing.
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

## Event display ordering

`dateLabel(date, true)` includes an abbreviated weekday using UTC date-only formatting, keeping day headings, date ranges and day selectors independent of the viewer's timezone. The timeline mounts day-specific add forms inside their article and binds the submitted day ID to that block; save/cancel returns focus to its local add button without scrolling to the itinerary heading. An active empty-day form remains visible when Hide empty days is checked. The itinerary-level add form retains the full day selector.

Private timeline reads order by start time (untimed first), `created_at`, then ID for identical creation timestamps, including legacy reads. The timeline uses a stable time sort to preserve that addition order. Migration 005 updates the sanitized public RPC to use the same ordering without exposing creation metadata. Public rendering preserves the RPC order for untimed entries. Editing uses the original creation time, not `updated_at`. Events imported in one transaction can share a creation timestamp; their original within-batch order was not recorded and uses the ID tie-breaker. Apply 005 after 004 for consistent public ordering.

## Trip tabs and calendar view

`TripTabs` provides ARIA tabs with roving keyboard focus and one visible panel. Panels mount on first selection and stay mounted while hidden, preserving drafts across tab changes and server refreshes. Saved-place maps and traveler requests defer until their tabs are first visited. The server controls which tabs and mutation controls each role receives; administration is inside the owner sharing panel.

`TripCalendar` uses the pure `lib/calendar/view.ts` model to group dated days into Monday–Sunday weeks in UTC for date-only arithmetic. Date gaps stay visible, month/year boundaries paginate correctly, and undated days appear in separate pages without invented dates. Cards show trip-local clock times, disclose next-day ends and omit private notes/booking data. The calendar scrolls inside its container on small screens. Downloads and timezone/date assignment remain in `CalendarExport` below the private grid. Public pages reuse the view with only allowlisted event fields; dashboard cards retain their existing summaries.

## Editing trip details and deletion

Owner dashboard cards and the private trip header expose edit/delete actions. `TripSettings` submits a title-only PATCH when the schedule was not changed, preserving nonconsecutive day dates. Full schedule updates accept a day count or an inclusive start/end range, up to 120 days, plus an optional timezone. Existing event times stay local. Cancel restores the saved values on reopening; failed requests retain the form. Scaffold mode renders both modes but disables saves/deletion. Editors and viewers do not receive these owner controls.

Migration 006 adds `update_trip_details`, an owner-only, authenticated RPC called by `PATCH /api/trips/[id]`. It locks the itinerary and atomically updates the title, mode, length, dates and timezone; existing day IDs/events are retained by day order and new days are appended. Shortening removes only empty trailing days. Occupied trailing days raise a conflict before any writes, mapped to HTTP 409. Existing date/timezone triggers maintain calendar revisions. Public and dashboard projections read the updated title/dates without additional schema fields. Missing RPCs return the controlled upgrade-required response; apply 006 before releasing trip-detail editing.

Deletion reuses the owner-only DELETE route and cascading database relationships. Both entry points name the trip in a confirmation explaining permanent removal and lost collaborator access. API/RLS checks remain authoritative; no production trip was deleted during local verification.

## Accounts and private profiles

Accounts reuse Supabase Auth and the original `profiles` row created by the auth-user trigger. Trips remain associated through `itineraries.owner_id`; accepted collaborators use `itinerary_members`. `/profile` requires the current authenticated user and reads only that user’s profile plus owned/membership itinerary IDs under RLS. `accountTripStats` deduplicates those readable trips and derives current created/collaboration/past/upcoming/open-date counts. Past uses `end_date < today`; upcoming includes active trips. Date classification uses the same UTC date boundary as the dashboard. Counts are live inventory, not lifetime activity or verified attendance. Pending invitations and unrelated public trips are excluded.

Migration 007 adds nullable, length-limited `display_name`, `home_city` and `bio` fields. It retains self-only profile RLS and adds no public projection or new permissions. `PATCH /api/profile` authenticates cookie/bearer sessions, accepts only those basic fields, and derives the update ID from Auth. Account email and member-since date are read from Auth; email uses the separate Auth flow below, and statistics cannot be submitted. Empty basic fields clear to null. Notes/profile fields are not added to public itineraries or calendar exports.

`readProfile` retries the baseline ID/join-date projection when new columns are missing; existing accounts/trips still render, with profile editing disabled and a controlled API upgrade response. Operational errors surface instead of silently inventing empty data. Scaffold `/profile` has example statistics and editable preview fields, with saving disabled. Migration 007 must be applied before enabling live profile edits.

Migration 008 creates the private `profile-photos` bucket with a 2 MB limit and JPG/PNG/WebP MIME allowlist. Storage select/insert/update policies restrict each account to the exact `<auth.uid()>/avatar` object; replacements reuse that path. No avatar URL or new profile column is stored. `GET/PUT /api/profile/photo` authenticates cookie/bearer sessions and derives the path server-side, ignoring caller account IDs. Uploads validate size, MIME and signature. The GET proxies Storage with `private, no-store` and `nosniff`, without public URLs or signed URLs. Missing photos/storage leave initials visible; upload failures retain the selected file and report an error. Apply 008 before photo uploads; other profile features still work without it.

`AccountEmailForm` calls the existing browser Supabase client's `auth.updateUser({email})`, preserving SDK-managed PKCE/session handling. Its fixed callback returns to `/settings/account` (legacy `/profile` confirmation destinations map there too), rejects external redirect destinations and reports failed confirmation codes. Pending `new_email` comes from Auth; the form never updates `profiles.email` or user IDs directly. Migration 008 synchronizes the private email mirror only when `auth.users.email` changes. Confirmation requirements follow the project's Supabase Auth configuration; keep secure email-change confirmations enabled. Email delivery and inbox confirmation require a staging account for end-to-end verification; automated tests do not send email or modify a live login.

`ProfileSummary` owns the edit disclosure and the shared avatar revision. Its header renders the authenticated `ProfileAvatar`, replacing the old initials-only header. Successful photo uploads increment the revision, refetching the no-store image even if the previous request fell back to initials. Photo and basic-field forms are siblings inside one profile editor, avoiding nested forms. Auth email editing lives on the separate `/settings/account` server page, which uses `requireUser` and reads email, pending email and join date directly from Auth; scaffold settings use sample details and disable submissions. Basic saves refresh server data and close editing; Cancel discards unsaved text fields, while photo uploads explicitly save immediately. Pending email changes and confirmation errors render in Account settings; legacy profile error URLs redirect there. Profile summary props no longer include email or join date, and no new profile visibility or collaborator access is granted. Travel statistics stay behind the existing profile authentication boundary. No profile access or Storage permissions change with this layout.
