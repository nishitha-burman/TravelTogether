# v1.4 verification record

Initial v1.4 verification ran locally November 17–18, 2026, with production release and owner-flow verification completed November 19. Later changes and production checks are recorded chronologically below; local follow-up entries describe their state when recorded.

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

Release commit `f0844856c1528f3fa018d695d3c3047483cacacf` was pushed to main and the release branch. Production deployment `dpl_Adi4DVRQmZ6iJSqn47oUroTrveTy` reached READY. Refreshed the signed-in Honolulu page and verified all four tabs, selected Calendar, and confirmed the weekly calendar rendered the owner's current 12 events, including recently edited times and titles. No trip data was modified during this release verification. Migration 005 remains blocked pending explicit approval.

## Migration 005 completion — November 23, 2026

After explicit approval, applied `005_event_addition_order.sql` to the production Supabase project. The SQL editor reported success. A read-only catalog check confirmed that `get_public_itinerary(text)` orders by start time, original creation time, then ID; anonymous and authenticated callers retain execute access. The same verification confirmed the private Honolulu itinerary still returns no public projection. No trip rows or visibility settings were changed. This resolves the migration-approval block described above; migration 005 is now applied.

## Trip edit/delete follow-up — November 23, 2026 (local, not deployed)

Added owner edit/delete actions to dashboard cards and the trip header, plus migration 006 and an owner-only trip-details PATCH. The local suite passes 46 tests, including atomic title/date/mode/length updates, preservation of day IDs and event notes, nonconsecutive dates on title-only updates, empty-day shortening, occupied-day rollback, date validation, API owner/cookie/bearer rules, controlled missing-RPC errors and owner-only cascading deletion. TypeScript, targeted ESLint and diff checks pass.

Scaffold browser checks verified the dashboard edit link opens settings, title input, both planning modes, day-count changes, native date keyboard changes and inclusive-length recalculation, occupied-day warnings, and cancel/reopen restoring saved values. Saves and deletion remain disabled in scaffold mode. Mobile layout and hidden owner controls for nonowners were checked. No live trip data was changed. Migration 006 is pending; this feature is not pushed or deployed.

## Account/profile follow-up — November 23, 2026 (local, not deployed)

Added a private `/profile` page, header navigation, profile edit API, basic fields in migration 007, and derived account trip statistics. The local suite passes 52 tests, with new checks for profile self-only RLS, field limits, anonymous denial, cookie-backed updates bound to the current Auth user, rejected ID/email/statistic payloads, clearing basic fields, deduplicated counts, today boundaries, baseline-schema fallback and operational failure handling. TypeScript, targeted ESLint and diff checks pass.

This work remains local alongside pending trip-edit migration 006. Migration 007 has not been applied to production, and no live profile or trip data was changed. Browser checks use the scaffold profile; no live save claim is made.

Local profile browser checks confirmed sample statistics, the Profile navigation link, editable name/city/bio fields, the bio character counter and disabled scaffold save. At 390px, all four statistic cards rendered without page-level horizontal overflow. Desktop and mobile checks used sample data only; no profile was saved to Supabase.

## Trip management and account profile release — November 23, 2026

After explicit approval, applied migrations 006 and 007 together in one production transaction and notified PostgREST to reload its schema. The SQL editor reported success. This enables the owner-only trip-details RPC and the private profile fields; no existing trip, profile value or visibility setting was edited by the migrations. This resolves the pending migration state in the preceding local follow-ups. The production build passed before publishing this release; the current test suite has 52 passing tests.

Release commit `1a1909358b79b27218d6a72a4f1ce89bf5c7e9ee` was pushed to main and the release branch. Production deployment `dpl_HMinADU4cjtjTUe8R9BnDQkaUDCm` reached READY. The signed-in live profile showed five created trips, zero collaborations, one past trip and four trips with open dates. Saving the existing blank profile fields returned Saved, and the profile reloaded successfully. Honolulu's owner edit/delete controls were enabled; saving its existing title without schedule changes returned Saved and retained November 4–8, 2026 and five days. No personal profile details, trip dates or events were changed, and no production trip was deleted. Deletion and destructive shortening remain covered by the local database/API tests.

## Profile photos and email changes — November 23, 2026 (local)

Added private profile-photo upload/replacement, a clearly labeled Name field, and a separate Auth email-change form with pending-confirmation and error states. Migration 008 provisions a private photo bucket, self-only exact-path Storage policies and an Auth email mirror trigger. It has not been applied to production and this follow-up has not been published.

The 58-test suite passed, including photo authentication/path binding, private cache headers, MIME/signature/size rejection, Storage RLS, email mirror updates, Auth update arguments/errors and callback destination/error handling. TypeScript, targeted ESLint and the production build passed. Scaffold browser verification confirmed the photo controls, editable name/email inputs, disabled upload/email submissions, privacy notices and no horizontal overflow at 1280px. No live photo was uploaded and no email-change message was sent. Real Storage HTTP upload and inbox confirmation remain staging checks; local mocks/PGlite do not verify Supabase email delivery or Storage service behavior.

## Profile photos and email release — November 23, 2026

After explicit approval to apply migration 008 and publish, ran the exact migration in the production SQL editor. It reported Success. The bucket is private and restricted to each authenticated account's avatar path; the email mirror trigger follows confirmed Auth email changes. This resolves the pending migration state above. No profile photo, personal field, email address or trip data was changed during migration application. The production build and 58-test suite recorded above passed before release.

Commit `560ea28266f8a41cd34af679635d3364371e9242` was pushed to main and the release branch. Production deployment `dpl_D9FaT5shDc1wfTvi3an7jVDFpwxQ` reached READY. The signed-in live `/profile` page rendered the new photo chooser, editable Name field, new-email field and enabled profile-save control. No photo or email change was submitted during this read-only production check; Storage upload delivery and inbox confirmation retain the staging verification limits above.

## Weekday labels and inline day events — November 24, 2026 (local)

Added abbreviated weekdays to private/public day headings, trip date ranges, dashboard start dates and event day choices using UTC date-only formatting. Day-specific Add event now mounts inside its day and submits that block's day ID. Cancel/save returns focus locally without scrolling to the itinerary heading; if an empty day becomes hidden, focus falls back without scrolling. Inline mutation errors stay beside the form. The itinerary-wide form retains its day selector.

Targeted calendar/rendering tests passed (14 tests), along with TypeScript, targeted ESLint and the production build. Scaffold browser checks confirmed one add form inside day 4, Cancel focusing that day's button while retaining scroll position, and an active empty-day form staying visible with Hide empty days enabled. Shared-page and dashboard weekday labels were checked. Saves remain disabled in scaffold mode; no production data changed. This follow-up is local and not published; no migration is required.

## v1.4.1 release — November 24, 2026

Publishes the weekday-label and inline day-event changes verified above. The header now displays v1.4.1. README and the agent guide record the version policy: increment the visible product version for each user-facing release, with no extra increment for documentation-only follow-ups. No database migration is required.

Release commit `aede3253939527d970a4d2833df021960ff8b3cc` was pushed to main and the release branch after the updated production build passed. Deployment `dpl_5N3m1LhxHxASp16nnWtztu8fAv4z` reached READY. The signed-in live Honolulu page showed v1.4.1 and weekday labels; day 4's Add event opened exactly one form inside day 4. Canceled the blank form without submitting any data. This resolves the local-only status above.

## Version correction — November 24, 2026 (local)

At the user's request, corrected the current product version to v1.5 in the header, README and product context. Earlier entries retain the version actually deployed at the time. This label-only change is available in the local dev server and has not been published.

## Profile summary cleanup — November 24, 2026 (local v1.5)

Replaced the separate photo, About you and account editing panels with a read-only profile summary and one Edit profile disclosure. The header uses the real authenticated photo; successful uploads notify the shared avatar revision so it refreshes immediately. Removed the Private badge beside the name while preserving self-only access and a short explanation inside editing. Basic fields, photo upload and email confirmation remain separate forms inside the same editor.

Nine targeted rendering/media tests passed, along with TypeScript, targeted ESLint and diff checks. On the local signed-in page, the existing uploaded photo loaded successfully (310px source width), exactly one profile image rendered, Edit profile exposed name/photo/email controls, and Cancel closed them. No personal values or photo were modified during verification. Upload HTTP and Auth behavior are unchanged; this UI cleanup requires no migration and has not been published. The local dev server remains running for iteration.

## Profile and account settings split — November 24, 2026 (local v1.5)

Moved email, pending email changes, confirmation errors and member-since details to authenticated `/settings/account`, linked from Profile. Profile editing now contains only photo/name/city/bio, and its server-to-client summary props omit email/join date. Travel statistics remain private and are labeled accordingly. No collaborator-facing profile access or new permissions were added.

Twelve targeted rendering/media/callback tests passed, plus TypeScript, targeted ESLint and diff checks. Browser verification confirmed no email/member-since fields on Profile and working navigation to the signed-in Account settings page. Anonymous requests contained Next.js's streamed sign-in redirect instead of account details. New email-change callbacks return to Account settings; tests also cover previously sent `/profile` callback links and rejection of external redirect destinations. No profile, email or photo changes were submitted. No migration is required; this remains part of the unpublished local v1.5 iteration.

## v1.5 release — November 24, 2026

Releases the profile summary, current-photo header and separate private Account settings experience described above, together with the user's corrected major.minor version policy. The header, README and product context display v1.5; local iteration is grouped into this single release bump. Product, architecture and agent instructions are updated. All 60 tests and the production build passed before publishing, including the new settings route. No migration or permission change is required. The local dev server is restarted after the build for continued iteration.

Release commit `237af040fa9b44589222545628110f2f62f0427a` was pushed to main and the release branch. Production deployment `dpl_AwbKZFtm7zg5YtjB55mLCYkjSwc9` reached READY. The signed-in live Profile showed v1.5, loaded the existing photo and exposed basic editing without email/member-since fields. Account settings navigation opened the new page with the email-change input and member-since detail. Canceled editing without submitting changes. This resolves the local-only status of the preceding v1.5 entries. The local dev server remains available on port 3100.
