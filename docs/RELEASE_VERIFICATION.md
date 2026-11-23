# v1.4 verification record

Verified locally November 17–18, 2026, with production release and owner-flow verification completed November 19. This record was reconciled November 23 from those checks; no new checks are implied by that documentation update.

## Production release and live checks

- Applied migrations 002–004 to the connected production Supabase project. Saved a private Honolulu itinerary for November 4–8, 2026, with five days, nine events, three saved places and `Pacific/Honolulu`. Unspecified day placements remain tentative and times remain unset.
- Pushed release commit `5bef6a401bd064fb77bfae3650317a30f88ad19c` to GitHub main and `codex/v1.4-release`. Vercel deployment `dpl_EPAMf3Ysxb9a2jBuLhUBV7oatHPh` reached READY and served v1.4 at https://travel-together-vert.vercel.app.
- Anonymous trip requests redirected to login without exposing itinerary titles/events; anonymous calendar requests returned 401. The deployment's error/fatal runtime-log scan returned no entries at verification time.
- Signed in on production, saved an existing event's private note, reloaded, and confirmed the note persisted. The dashboard and trip detail showed the saved Honolulu itinerary and owner controls.
- Downloaded the authenticated calendar snapshot and inspected the file: nine events, nine unique UIDs, all-day dates matching the populated days, Hawaii timezone disclosure and an incremented event revision. Private notes and ticket details were excluded. November 8 has no events, so it contributes no calendar entry.
- No calendar-client import, invitation email, provider connection, separate-account collaboration test or live Storage test was performed. Automated RLS/role coverage is not a substitute for those remaining integration checks.

## Automated checks

Final checks after dependency security updates all passed: clean `npm ci --ignore-scripts --no-audit --no-fund`, `npm test` (32 tests), `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 15.5.29), and `git diff --check`.

The suite contains 32 tests:

| Suite | Coverage | Tests |
| --- | --- | --- |
| `tests/database.test.ts` | Runs migrations 001–004 in local PostgreSQL/PGlite; anonymous/unrelated raw-table isolation, sanitized public projection, visibility revocation, editor/viewer writes, member removal, cross-trip FK, transactional date rollback and revisions, day resequencing/deletion, confirmed-email invite acceptance, upload path policy | 9 |
| `tests/calendar.test.ts` | Stable UIDs/revisions, escaping/injection and UTF-8 folding, private-field exclusion, summer/winter/non-hour timezone offsets, all-day boundary, overnight/default duration, DST gap/fold rejection, readiness, deleted events, roles and validation | 9 |
| `tests/routes.test.ts` | Cookie/bearer authentication, 401/403 role matrix, owner-only administration, malformed payloads, cross-trip day checks, missing RPC response, private downloads/readiness, scaffold authentication | 8 |
| `tests/compatibility.test.ts` | Baseline/pre-timezone reads retain existing data; missing day/revision columns default safely; operational failures surface instead of returning empty plans | 4 |
| `tests/rendering.test.ts` | Real scaffold timeline/calendar rendering, disabled persistence, viewer controls | 2 |

The database harness supplies minimal Supabase Auth/Storage tables and JWT identity functions. It removes only `CREATE EXTENSION pgcrypto`, because UUID generation is already available. It exercises real SQL, constraints, transactions and RLS, but not Supabase HTTP infrastructure or concurrent connections. Route tests mock network clients; they do not prove live session refresh.

## Rendered checks

Used the local dev server with both Supabase variables explicitly empty. Browser checks covered desktop (1280×900) and mobile (390×844), including:

- Landing page, dashboard grouping/roles/readiness, trip creation, dated and undated workspaces, and public itinerary. No horizontal overflow was observed on checked mobile surfaces.
- Owner/editor/viewer previews: owners see sharing; editors see content/date controls without sharing; viewers see read-only content. Public view contains no forms.
- Creation day-count/date-range switch and explicit timezone selection; calendar date/timezone disclosure and destination suggestion. Saving is deliberately disabled in scaffold mode. The browser automation did not complete native date-segment entry, so no manual date-save claim is made.
- Event editing opens with title focus; Tab reaches the category with a visible focus ring; cancel returns focus to the itinerary heading.
- Saved-place search returned a real Belém result; Tab/Enter selected it, moved focus to the name field, and kept suggestions closed. Google’s map rendered. Saving remained disabled.
- Owner sharing disclosure explains roles, pending invitations, public/private fields and that no email is sent.
- The final clean browser tab reported no warning/error logs. Screenshots were saved outside the repository as desktop/mobile review artifacts. Temporary viewport overrides were reset and the owned preview server was stopped.
- After the dependency update and clean install, the desktop workspace and cover image rendered again on Next.js 15.5.29; mobile event editing retained title focus, restored heading focus on cancel, and had no horizontal overflow.

## Dependency audit

The initial registry audit reported 26 affected packages, including a critical Next.js advisory. The release updates Next.js within 15.x, aligns its ESLint config, upgrades Zod after reviewing its migration guide, and applies compatible transitive patches. A targeted PostCSS override replaces Next.js's old pinned 8.x copy; the brace-expansion override updates only its 1.x branch. Remove these overrides once upstream dependencies require the patched versions themselves.

`npm audit --omit=dev` reports **0 vulnerabilities**. The full `npm audit` still reports **20 high-severity development-toolchain findings**, rooted in the [picomatch ReDoS advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) and its dependent lint/build/test packages. A clean full audit is not claimed; broad forced toolchain downgrades were not applied. The runtime lockfile uses Next.js 15.5.29, sharp 0.35.5, Zod 4.6.7 and PostCSS 8.5.33. This is a point-in-time registry audit, not a security certification.

## Remaining integration checks

1. For future migration releases, back up the database and validate changes in staging first. Migrations 002–004 are already applied to this production project; do not rerun the non-idempotent migration scripts. A pre-release database backup was not verified in this record.
2. Use separate owner, editor, viewer and unrelated accounts plus an anonymous client. Exercise live cookie refresh and bearer requests, confirm raw public-trip notes/membership are inaccessible, and inspect public RPC/network responses for private fields.
3. Accept an invitation with the confirmed matching email, change/revoke roles, remove a traveler, and confirm private page/API access changes. Check an unconfirmed account cannot accept an invite.
4. Create both planning modes; assign dates/timezone; edit/delete an event; append/delete a day; retry failed writes and exercise simultaneous day changes. Check stored dates, revisions and trip summaries, not only UI messages.
5. Upload valid/oversized/disallowed covers and attempt another user's object prefix through the real Storage API. Confirm cleanup on failed creation. Ambiguous network failures and old unscoped images still need lifecycle cleanup.
6. Download through cookie and bearer sessions; import all-day, timed and overnight fixtures into Apple Calendar, Google Calendar and Outlook. Check displayed dates/offsets and document repeated-import behavior. No calendar-client imports were performed here.

Subscriptions, cancellation tombstones, provider OAuth, sync workers, per-leg timezones, realtime updates and conflict history remain intentionally unimplemented. The [calendar ADR](CALENDAR_DELIVERY_ADR.md) defines the next release's ownership, privacy, revocation and deletion contracts.

## Event ordering follow-up (local validation)

Untimed private/public timeline events now retain addition order; timed entries remain chronological. Targeted rendering, migration/RLS and compatibility suites passed (17 tests), along with targeted ESLint, TypeScript and diff checks. Regression coverage verifies that edits do not reorder untimed events. Migration 005 updates only public RPC ordering and is pending production application. Events with identical creation timestamps, including the original Honolulu bulk import, retain a deterministic ID tie-breaker because within-batch addition order was not stored.

## Tabs and calendar follow-up (local validation)

Replaced section anchors with accessible tabs on private and public trip pages. Calendar now renders a Monday–Sunday event grid, all-day/timed groups, empty dates, undated-day pages, week navigation and next-day end labels. The full local suite passes (39 tests), including new week/year boundary, date-gap, undated-day, ordering, private-note omission and initial-tab coverage. TypeScript, targeted ESLint and diff checks pass.

Local scaffold browser checks covered owner tab switching, arrow/End keyboard navigation, a single visible panel, retained unsaved event input, automatically opened sharing controls, and the desktop calendar. At 390px, the page had no horizontal overflow and the calendar scrolled within its own container. Viewer calendar controls remained read-only; the public calendar rendered nine sanitized events. The undated editor view was also checked. These are local checks; production verification for the tabbed layout is recorded separately below.

## Tabs and calendar release — November 23, 2026

Production build passed before this release, alongside the 39-test suite and targeted browser checks recorded above. The application changes and migration 005 are included in this release. Automatic approval review blocked execution of migration 005 because pushing/deploying the app was not explicit approval for replacing a production database function. The migration remains unapplied: private timelines use addition order, while public timelines continue using the previously installed RPC ordering until 005 is approved and applied. The tabbed UI and calendar do not depend on that migration.
