# TravelTogether Engineering Backlog

This backlog converts the July 2026 architecture review into implementation-ready work. Priorities reflect security and data-integrity risk first, followed by maintainability, user experience, performance, and product expansion.

## Priority definitions

- **P0 — Critical:** Security exposure or credible data-corruption risk. Address before expanding collaboration or public sharing.
- **P1 — High:** Foundational correctness, authorization, reliability, or testing work.
- **P2 — Medium:** User experience, maintainability, and performance improvements.
- **P3 — Later:** Product expansion or operational maturity work that depends on earlier foundations.

## Recommended delivery sequence

1. Secure public data and image storage.
2. Make multi-step mutations transactional and enforce relational integrity.
3. Introduce explicit collaborator permissions.
4. Centralize and type the data-access layer.
5. Improve mutation UX and decompose large client components.
6. Add comprehensive automated tests and CI.
7. Add caching, rate limiting, observability, and real-time features.

---

## Epic A — Public data and storage security

### TT-001 — Prevent public access to private event fields

- **Priority:** P0
- **Area:** Database / RLS / Public sharing
- **Problem:** `can_access_itinerary()` considers public trips fully accessible. Anonymous Supabase clients can therefore query complete event rows, including `notes` and `metadata` containing booking references or confirmation codes.
- **Scope:**
  - Separate authenticated trip access from public-share access.
  - Remove anonymous access to raw `itinerary_events` rows.
  - Expose only explicitly public event fields through a sanitized view or RPC.
  - Update `/public/[slug]` to use the sanitized interface.
- **Acceptance criteria:**
  - Anonymous users cannot select event `metadata`, private notes, or booking details through Supabase.
  - Public itinerary pages still display titles, types, dates, and explicitly approved public fields.
  - Owners and authorized members retain the intended private view.
  - RLS tests cover anonymous, unrelated authenticated, viewer, editor, and owner access.
- **Dependencies:** None.

### TT-002 — Stop exposing membership rows for public itineraries

- **Priority:** P0
- **Area:** Database / Privacy
- **Problem:** The membership read policy uses broad itinerary access, which can expose member user IDs for public trips.
- **Scope:** Restrict membership reads to the owner and appropriate authenticated members; do not derive this permission from public visibility.
- **Acceptance criteria:**
  - Anonymous and unrelated users cannot query `itinerary_members` for a public trip.
  - Owners can manage membership.
  - Members can access only the minimum membership data required by product UX.
- **Dependencies:** Coordinate with TT-001 so access helper functions have clear semantics.

### TT-003 — Harden trip image storage policies

- **Priority:** P0
- **Area:** Supabase Storage
- **Problem:** Any authenticated user can upload arbitrary objects to the public bucket without path ownership, file-size, MIME-type, replacement, or deletion controls.
- **Scope:**
  - Use object paths such as `{user_id}/{trip_id}/{uuid}`.
  - Enforce user/trip ownership in storage policies.
  - Restrict file size and accepted MIME types.
  - Add owner-scoped update/delete rules.
  - Decide whether private-trip images need signed URLs instead of a public bucket.
  - Clean up abandoned or replaced uploads.
- **Acceptance criteria:**
  - A user cannot upload into or mutate another user's path.
  - Unsupported types and oversized files are rejected.
  - Replaced/deleted trip images do not accumulate indefinitely.
  - Private image visibility matches the documented product decision.
- **Dependencies:** May require a migration and changes to `create-trip-form.tsx`.

### TT-004 — Restrict Next.js remote image origins

- **Priority:** P1
- **Area:** Security / Next.js configuration
- **Problem:** `next.config.ts` currently accepts images from every HTTPS hostname.
- **Scope:** Allow only Supabase Storage and explicitly approved image providers, or introduce a validated image proxy.
- **Acceptance criteria:**
  - Approved trip images render in normal and scaffold modes.
  - Arbitrary remote origins are rejected.
  - Allowed origins are documented in environment/setup guidance.
- **Dependencies:** Final storage decision from TT-003.

---

## Epic B — Transactional data integrity

### TT-005 — Create itineraries and initial days atomically

- **Priority:** P0
- **Area:** Database / API
- **Problem:** Trip creation inserts the itinerary and its days separately. Day insertion failures can leave incomplete trips, and some failures are ignored before returning `201`.
- **Scope:** Implement a PostgreSQL function such as `create_itinerary_with_days` and call it from the creation route.
- **Acceptance criteria:**
  - Either the itinerary and all expected days are created, or no records are created.
  - The API never returns success when day creation failed.
  - Date-range calculations and maximum lengths remain validated.
  - Both current and documented compatibility paths have explicit behavior.
- **Dependencies:** Schema-version strategy in TT-013 may influence compatibility handling, but should not block the integrity fix.

### TT-006 — Append trip days atomically and safely under concurrency

- **Priority:** P0
- **Area:** Database / API
- **Problem:** The next day number is calculated using a count followed by a separate insert. Concurrent requests can choose the same day number, and itinerary length/end-date updates are separate operations.
- **Scope:** Add a transaction-backed `append_trip_day` function using row locking or an equivalent concurrency-safe strategy.
- **Acceptance criteria:**
  - Concurrent requests cannot create duplicate day numbers.
  - `trip_length_days` and `end_date` remain synchronized with the inserted day.
  - Any failure rolls back the full operation.
- **Dependencies:** None.

### TT-007 — Delete and resequence days atomically

- **Priority:** P0
- **Area:** Database / API
- **Problem:** Day deletion is followed by parallel renumbering. Updates may collide with the unique day-number constraint, failures are ignored, and itinerary summary fields can drift.
- **Scope:** Implement `delete_and_resequence_trip_day` as a single database transaction. Use a safe temporary numbering or ordered update strategy.
- **Acceptance criteria:**
  - Deleting any day leaves contiguous numbering starting at 1.
  - Cascaded events are handled as documented.
  - Length and end date remain correct.
  - Constraint or update failures roll back deletion.
- **Dependencies:** None.

### TT-008 — Accept invitations atomically

- **Priority:** P1
- **Area:** Database / Authentication
- **Problem:** Member insertion and invite acceptance are separate operations in a loop, and errors are ignored.
- **Scope:** Add an `accept_itinerary_invite` RPC that validates the current user's normalized email, inserts membership, and marks the invite accepted atomically.
- **Acceptance criteria:**
  - An invite cannot be marked accepted without corresponding membership.
  - Acceptance is idempotent.
  - One failing invite does not silently produce inconsistent state.
  - Errors are observable and handled by the dashboard.
- **Dependencies:** Authorization model from TT-010 should be considered.

### TT-009 — Enforce that events belong to a day in the same itinerary

- **Priority:** P0
- **Area:** Database constraints
- **Problem:** `itinerary_events` contains `itinerary_id` and `day_id`, but the database does not ensure the referenced day belongs to that itinerary.
- **Scope:**
  - Add a unique constraint on `trip_days(id, itinerary_id)`.
  - Add a composite foreign key from `itinerary_events(day_id, itinerary_id)`.
  - Audit and repair invalid existing rows before enabling the constraint.
- **Acceptance criteria:**
  - Cross-itinerary event/day associations are rejected at the database layer.
  - Existing valid data migrates without loss.
  - Event API tests cover invalid cross-trip day IDs.
- **Dependencies:** None.

---

## Epic C — Authorization and collaboration

### TT-010 — Define a capability-based trip permission model

- **Priority:** P1
- **Area:** Architecture / Authorization
- **Problem:** The schema defines `viewer` and `editor`, but route handlers permit owner-only mutations. Public visibility is also conflated with private access.
- **Scope:** Define and document capabilities such as:
  - `canViewPrivateTrip`
  - `canEditContent`
  - `canManageSharing`
  - `canDeleteTrip`
- **Acceptance criteria:**
  - A role/capability matrix is documented.
  - Server authorization helpers and RLS policies implement the same matrix.
  - Public access is not treated as membership.
- **Dependencies:** TT-001 and TT-002 should establish secure public semantics.

### TT-011 — Enable editor-role mutations

- **Priority:** P1
- **Area:** Product / API / RLS
- **Problem:** Invited collaborators can view trips but cannot perform the editing implied by the `editor` role.
- **Scope:** Replace owner-only checks for timeline and marker mutations with capability-based checks. Keep sharing, deletion, and ownership changes owner-only.
- **Acceptance criteria:**
  - Editors can add/edit/delete days, events, and markers.
  - Viewers cannot mutate trip content.
  - Only owners can change visibility, invite/remove members, or delete the trip.
  - Server-rendered and client fetch behavior are both verified.
- **Dependencies:** TT-010 and the associated RLS migration.

### TT-012 — Add collaborator management UX

- **Priority:** P2
- **Area:** Frontend / Product
- **Scope:** Show invite state and member roles; allow owners to change roles, revoke invites, and remove members.
- **Acceptance criteria:**
  - Owner can view pending and accepted collaborators.
  - Role changes and removal are reflected without a full reload.
  - Non-owners do not see owner-only controls.
- **Dependencies:** TT-010 and TT-011.

---

## Epic D — Data-access architecture and schema evolution

### TT-013 — Introduce an explicit database schema-version strategy

- **Priority:** P1
- **Area:** Database / Deployment
- **Problem:** The application detects old schemas by matching fragments of database error messages such as `column` and `day_date`.
- **Scope:**
  - Track an explicit schema version.
  - Validate migrations during deployment.
  - Route compatibility through version-aware adapters.
  - Define a retirement date for legacy fallbacks.
- **Acceptance criteria:**
  - Compatibility decisions do not depend on localized or changing error text.
  - Deployment documentation specifies migration order.
  - Unsupported schema versions produce a clear operational error.
- **Dependencies:** None.

### TT-014 — Centralize server-side trip queries

- **Priority:** P1
- **Area:** Architecture / Maintainability
- **Problem:** Owner and public pages duplicate queries, normalization, and compatibility logic. Child-query errors can be discarded, resulting in silently incomplete pages.
- **Scope:** Create a server-only trip repository, for example:

  ```text
  lib/server/trips/
    access.ts
    queries.ts
    mutations.ts
    compatibility.ts
    schemas.ts
  ```

- **Acceptance criteria:**
  - Owner/member and public pages use shared query primitives.
  - Public projections remain sanitized.
  - The repository distinguishes not found, forbidden, schema mismatch, and transient database errors.
  - Child-query errors are handled explicitly.
  - Scaffold mode remains functional.
- **Dependencies:** Coordinate with TT-001 and TT-013.

### TT-015 — Generate and use Supabase database types

- **Priority:** P1
- **Area:** TypeScript / Database
- **Scope:** Generate schema types and parameterize browser/server Supabase clients. Retain separate domain models where normalized compatibility data is needed.
- **Acceptance criteria:**
  - Supabase queries and mutations are schema typed.
  - Manually duplicated row types are removed or converted into explicit domain/view models.
  - Type generation is documented and available as an npm script.
- **Dependencies:** Preferably after the P0 schema migrations stabilize.

### TT-016 — Consolidate dashboard trip loading

- **Priority:** P2
- **Area:** Database / Performance
- **Problem:** The dashboard fetches owned trips, member IDs, and member trips in multiple stages, then deduplicates and sorts in application code.
- **Scope:** Add a typed view or RPC that returns all accessible dashboard trips, role information, and sort order in one call.
- **Acceptance criteria:**
  - Dashboard uses one data operation after invitation acceptance.
  - Results include owner/member role and are ordered by update time.
  - Owned and shared trips are not duplicated.
- **Dependencies:** TT-010 and TT-014.

### TT-017 — Consider a consolidated trip-detail read model

- **Priority:** P3
- **Area:** Database / Performance
- **Scope:** Evaluate a typed RPC/read model that returns trip, days, events, and markers with appropriate private/public projections.
- **Acceptance criteria:**
  - Decision record compares current parallel queries with an RPC/read model.
  - If implemented, authorization and sanitized public fields are tested.
- **Dependencies:** TT-001, TT-014, and TT-015.

---

## Epic E — API validation and error handling

### TT-018 — Create shared strict request schemas

- **Priority:** P1
- **Area:** API / Validation
- **Scope:** Centralize Zod schemas for trips, days, events, markers, settings, and invitations. Validate time formats, URL fields, notes/metadata sizes, and type-specific event metadata; reject unknown keys.
- **Acceptance criteria:**
  - API routes and client forms use compatible shared definitions where practical.
  - Invalid times, URLs, oversized notes, and unexpected keys receive `400` responses.
  - Metadata is validated according to event type.
- **Dependencies:** None.

### TT-019 — Standardize API errors and malformed JSON handling

- **Priority:** P1
- **Area:** API / Observability
- **Problem:** Some routes expose raw database messages and assume `request.json()` succeeds.
- **Scope:** Introduce a route error helper with stable codes and safe messages.
- **Acceptance criteria:**
  - Malformed JSON returns a controlled `400` response.
  - Database internals are not exposed to clients.
  - Responses include stable error codes suitable for UI handling and logs.
  - Unexpected failures are logged with request context but without secrets.
- **Dependencies:** None.

### TT-020 — Return mutation records instead of `{ ok: true }`

- **Priority:** P2
- **Area:** API / Frontend integration
- **Scope:** Return created/updated/deleted entity identifiers and the new authoritative state needed by optimistic UI.
- **Acceptance criteria:**
  - Timeline and map clients can reconcile local state without a full page reload.
  - Response schemas are typed and tested.
- **Dependencies:** TT-018; coordinate with TT-021.

---

## Epic F — Mutation UX and frontend maintainability

### TT-021 — Replace timeline full-page reloads with local updates

- **Priority:** P2
- **Area:** Frontend / UX
- **Problem:** Timeline add/edit/delete operations call `window.location.reload()`, losing UI state and forcing all server queries and assets to reload.
- **Scope:** Use returned mutation records with React state/`useOptimistic`, SWR, or Server Actions. `router.refresh()` may be used as an interim step.
- **Acceptance criteria:**
  - Adding, editing, and deleting days/events does not reload the document.
  - Failed optimistic mutations roll back and show an accessible error.
  - Buttons expose pending state and prevent duplicate submissions.
  - Condensed/full view and current form state are preserved.
- **Dependencies:** TT-020 and preferably TT-005 through TT-007.

### TT-022 — Replace map editor reloads with local updates

- **Priority:** P2
- **Area:** Frontend / UX
- **Acceptance criteria:**
  - Added markers appear immediately without a document reload.
  - Failed additions restore prior state and display a useful error.
  - Duplicate submissions are prevented.
- **Dependencies:** TT-020.

### TT-023 — Decompose the timeline editor

- **Priority:** P2
- **Area:** Frontend architecture
- **Scope:** Split the large component into focused units such as `TimelineEditor`, `DayCard`, `DayForm`, `EventForm`, `EventCard`, and `useTimelineMutations`.
- **Acceptance criteria:**
  - Transport, form state, event metadata configuration, and rendering have clear boundaries.
  - Behavior remains covered by component/integration tests.
  - Accessibility labels and keyboard behavior are preserved or improved.
- **Dependencies:** Best performed with TT-021 to avoid refactoring the same code twice.

### TT-024 — Decompose create-trip and map editor components

- **Priority:** P3
- **Area:** Frontend architecture
- **Scope:** Extract destination autocomplete, image upload, planning-mode fields, marker search, and map presentation into focused components/hooks.
- **Acceptance criteria:**
  - Shared location-search behavior is reusable.
  - Upload and form concerns are independently testable.
  - Scaffold mode remains intact.
- **Dependencies:** TT-003 and TT-022 may affect implementation boundaries.

### TT-025 — Add accessible confirmation and notification UI

- **Priority:** P2
- **Area:** Accessibility / UX
- **Scope:** Replace browser `confirm` dialogs and scattered inline errors with accessible dialogs and status/toast patterns.
- **Acceptance criteria:**
  - Destructive actions require clear confirmation.
  - Focus is managed correctly.
  - Success and error feedback is announced to assistive technology.
- **Dependencies:** Can be delivered alongside TT-021 and TT-022.

---

## Epic G — Performance and platform configuration

### TT-026 — Cache sanitized public itinerary pages

- **Priority:** P2
- **Area:** Next.js / Performance
- **Scope:** Add tagged caching for public read models and invalidate tags after relevant owner/editor mutations.
- **Acceptance criteria:**
  - Public pages avoid unnecessary database reads.
  - Visibility changes and edits invalidate cached content promptly.
  - Private/authenticated pages do not leak through shared caches.
- **Dependencies:** TT-001 and TT-014.

### TT-027 — Add location-search caching, rate limiting, and timeouts

- **Priority:** P1
- **Area:** External API / Reliability
- **Problem:** Location search always bypasses caching and has no explicit application rate limit or upstream timeout.
- **Scope:**
  - Debounce client requests.
  - Add short-lived normalized-query caching.
  - Add per-client/IP rate limiting.
  - Add an upstream timeout and controlled retry behavior.
  - Ensure Nominatim identification and usage comply with its current policy.
- **Acceptance criteria:**
  - Repeated equivalent queries reuse cached results.
  - Abusive request rates receive `429`.
  - Slow upstream calls terminate within a defined limit.
  - Upstream failures do not crash route handlers.
- **Dependencies:** Confirm infrastructure choice for shared rate-limit/cache state.

### TT-028 — Remove unnecessary development cache invalidation

- **Priority:** P2
- **Area:** Developer experience
- **Problem:** The dev script deletes `.next`, while webpack caching is disabled in development.
- **Scope:** Remove both behaviors unless a reproducible issue requires them; document any retained workaround.
- **Acceptance criteria:**
  - Normal development startup no longer deletes `.next`.
  - Development caching is enabled.
  - Hot reload and scaffold mode are smoke-tested.
- **Dependencies:** None.

### TT-029 — Audit bundle and client boundaries

- **Priority:** P2
- **Area:** Next.js / Performance
- **Scope:** Measure route bundles, ensure browser-only map code remains dynamically loaded, and move logic to Server Components where interactivity is unnecessary.
- **Acceptance criteria:**
  - Bundle-analysis output is recorded.
  - Heavy map dependencies are absent from unrelated routes.
  - Any optimization is backed by before/after measurements.
- **Dependencies:** TT-023 and TT-024 may make boundaries easier to adjust.

---

## Epic H — Testing, CI, and operations

### TT-030 — Add database and RLS test coverage

- **Priority:** P0
- **Area:** Testing / Security
- **Scope:** Test each table and RPC as anonymous, unrelated authenticated user, viewer, editor, and owner.
- **Acceptance criteria:**
  - Tests prove public users cannot access private event metadata or membership rows.
  - Tests cover all CRUD permissions and storage policies.
  - Tests run against a reproducible local/test Supabase environment.
- **Dependencies:** Should be added with TT-001 through TT-011, not postponed until after them.

### TT-031 — Add unit and route integration tests

- **Priority:** P1
- **Area:** Testing
- **Scope:** Cover date-range calculations, compatibility adapters, schemas, route authentication, validation, and transaction failure behavior.
- **Acceptance criteria:**
  - Critical business rules have focused tests.
  - Route tests cover malformed JSON and stable error codes.
  - Tests run deterministically without production credentials.
- **Dependencies:** TT-018 and TT-019 improve testable boundaries.

### TT-032 — Add end-to-end browser tests

- **Priority:** P1
- **Area:** Testing / Product
- **Scope:** Cover sign-up/login, trip creation, invitation acceptance, owner/editor/viewer behavior, timeline editing, marker creation, public sharing, and scaffold-mode smoke tests.
- **Acceptance criteria:**
  - Core journeys run headlessly in CI.
  - Public/private access regressions fail the suite.
  - At least one mobile viewport is covered.
- **Dependencies:** Stable test authentication and database fixtures.

### TT-033 — Add continuous integration

- **Priority:** P1
- **Area:** CI/CD
- **Scope:** Run dependency install, typecheck, lint, tests, migration checks, and production build on pull requests.
- **Acceptance criteria:**
  - Pull requests cannot merge when required checks fail.
  - Build and test commands are documented.
  - CI uses pinned Node/package-manager versions and dependency caching.
- **Dependencies:** TT-030 through TT-032 can be added incrementally.

### TT-034 — Repair lint configuration and scripts

- **Priority:** P1
- **Area:** Tooling
- **Scope:** Configure ESLint for the installed Next.js/ESLint versions and replace obsolete or nonfunctional scripts where necessary.
- **Acceptance criteria:**
  - `npm run lint` completes locally and in CI.
  - React, accessibility, TypeScript, and Next.js rules are active.
  - Existing violations are fixed or narrowly documented.
- **Dependencies:** None.

### TT-035 — Add structured logging and error monitoring

- **Priority:** P2
- **Area:** Operations
- **Scope:** Add request-correlated structured logs, safe server error reporting, and monitoring for failed mutations, auth failures, location upstream errors, and public-page latency.
- **Acceptance criteria:**
  - Production failures can be traced without exposing tokens or private itinerary content.
  - Alerts exist for sustained error-rate increases.
  - Error responses include a support correlation ID where appropriate.
- **Dependencies:** TT-019.

### TT-036 — Add migration verification and rollback guidance

- **Priority:** P1
- **Area:** Database operations
- **Scope:** Test migrations from both the original and current schema, document backup/rollback procedures, and verify constraints before enforcement.
- **Acceptance criteria:**
  - Migrations are idempotent where intended and tested from supported versions.
  - Destructive or locking operations are identified before deployment.
  - A rollback/forward-fix procedure is documented.
- **Dependencies:** Coordinate with all database backlog items.

### TT-037 — Update stale setup documentation

- **Priority:** P2
- **Status:** In progress
- **Area:** Documentation
- **Problem:** The README says Node/npm are unavailable in this workspace, although type checking currently runs successfully. Migration instructions also emphasize only the initial migration.
- **Scope:** Update local setup, full migration order, verification commands, scaffold-mode expectations, and version-label maintenance.
- **Acceptance criteria:**
  - A new contributor can install, migrate, typecheck, test, build, and run the app from documented steps.
  - All required migrations are listed in order.
  - Manual product-version behavior is clearly documented.
- **Dependencies:** Revisit after TT-013 and TT-033.
- **Progress:** README migration order, verification commands, calendar behavior, future phases, and the obsolete Node/npm constraint were updated with the initial calendar-export release. CI/test and schema-version documentation remain dependent on TT-013 and TT-033.

---

## Epic I — Product and collaboration expansion

### TT-038 — Add revision tracking and optimistic concurrency

- **Priority:** P3
- **Area:** Collaboration / Data model
- **Scope:** Add revision/version fields or a change log so concurrent editors cannot silently overwrite each other.
- **Acceptance criteria:**
  - Mutations detect stale client versions.
  - Conflicts produce a recoverable UI instead of last-write-wins data loss.
  - Change records identify actor, entity, action, and timestamp.
- **Dependencies:** TT-005 through TT-011 and TT-021.

### TT-039 — Add Supabase Realtime synchronization

- **Priority:** P3
- **Area:** Collaboration / Frontend
- **Scope:** Subscribe to authorized trip changes and reconcile them with optimistic local state.
- **Acceptance criteria:**
  - Two editors see day, event, and marker changes without reloading.
  - Subscriptions respect RLS and are cleaned up correctly.
  - Conflicts follow the strategy established in TT-038.
- **Dependencies:** TT-011, TT-021, and TT-038.

### TT-040 — Add calendar export

- **Priority:** P3
- **Status:** In progress
- **Area:** Product
- **Scope:** Generate standards-compliant ICS output first; evaluate Google Calendar deep links/integration separately.
- **Delivered:**
  - Authenticated users with trip read access can download a full date-range timeline from `/api/trips/[id]/calendar`.
  - Timed events, one-hour default duration, all-day events, next-day end times, locations, notes, booking URLs, stable UIDs, text escaping, and UTF-8 line folding are implemented.
  - Confirmation codes, ticket references, and unapproved metadata are excluded.
  - The authenticated trip page explains empty, undated, and scaffold-mode states.
- **Remaining:**
  - Add automated ICS and route tests plus manual import verification across target calendar applications.
  - Add sanitized public-page export after TT-001 defines public event projections.
  - Add explicit timezone behavior through TT-041.
  - Evaluate individual-event export, subscriptions, and direct Google Calendar integration separately.
- **Acceptance criteria:**
  - Date-range trips and timed/untimed events export correctly.
  - Time-zone behavior is explicit and tested.
  - Public exports do not include private metadata.
- **Dependencies:** Event date/time model and TT-001 public-field rules.

### TT-041 — Improve event time and timezone modeling

- **Priority:** P2
- **Area:** Data model
- **Problem:** Events store times as free text and trips do not have an explicit timezone, which complicates sorting, conflict detection, and calendar export.
- **Scope:** Define trip timezone and typed local event times/dates; plan migration from current values.
- **Acceptance criteria:**
  - Event ordering is deterministic.
  - Overnight events and travel across time zones have documented behavior.
  - Calendar export can produce correct timestamps.
- **Dependencies:** Should precede timezone-aware completion of TT-040 and automated conflict detection.
- **Dependency note:** The current TT-040 slice emits floating local times. TT-041 is required before timezone-aware export, automated synchronization, or reliable multi-timezone conflict detection.

### TT-042 — Add conflict detection for itinerary events

- **Priority:** P3
- **Area:** Product / Validation
- **Scope:** Detect overlapping stays, transport, and timed activities with actionable warnings.
- **Acceptance criteria:**
  - Conflicts are warnings unless a product rule explicitly makes them blocking.
  - Overnight and timezone cases are covered.
- **Dependencies:** TT-041.

---

## Definition of done for backlog items

Unless an item states otherwise, completion requires:

- Existing scaffold mode still works.
- Relevant TypeScript and database types are updated.
- API, RLS, and migration changes are kept in sync.
- Owner/member trip page, public page, and dashboard impacts are checked.
- New behavior has proportionate automated tests.
- Accessibility and error states are considered for UI changes.
- Documentation is updated when setup, schema, permissions, or operations change.
- `npm run typecheck`, `npm run lint`, the applicable tests, and `npm run build` pass.

## Review baseline

At the time this backlog was created:

- `npm run typecheck` passed.
- No automated test suite or CI workflow was found.
- The production build was initially unverified. `npm run typecheck` and `npm run build` both passed for the calendar-export implementation in July 2026.
