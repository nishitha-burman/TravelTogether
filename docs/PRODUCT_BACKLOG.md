# TravelTogether Product Backlog

## Purpose

This backlog prioritizes the next product work around TravelTogether's core promise: helping a small group build and use one shared trip plan. Items are ordered by customer value and technical dependency, not just implementation size.

## Priority Definitions

- **P0** — Required for the next release or a dependency for other P0 work.
- **P1** — High-value follow-up that completes the experience.
- **P2** — Valuable enhancement after the core workflow is proven.

## Delivery Status

- **Delivered** — Implemented and documented for the stated scope.
- **In progress** — A useful slice is implemented, but one or more acceptance criteria remain.
- Items without a status have not started.

## Product Outcomes

1. Invited travelers can meaningfully contribute to a trip.
2. Editing a plan feels immediate, reliable, and safe.
3. A completed itinerary remains useful in travelers' calendars and during the trip.

---

## Epic 1 — True Collaborator Editing

**Goal:** Let invited members participate in planning while preserving clear owner controls.

**Why now:** Shared trips can be viewed today, but most mutation APIs require ownership. This is the largest gap between the product promise and current behavior.

### COLLAB-01: Define and enforce trip roles

- **Priority:** P0
- **Scope:** Extend the existing member role model into a consistent permission system for `owner`, `editor`, and `viewer` behavior.
- **Acceptance criteria:**
  - Owners can perform every trip action.
  - Editors can create, update, reorder, and delete days, events, and markers.
  - Viewers have read-only access.
  - Only owners can change visibility, manage invitations or members, transfer ownership, or delete a trip.
  - API authorization returns `401` for unauthenticated requests and `403` for authenticated users without permission.
  - Authorization is enforced server-side and does not rely on hidden UI controls.
  - Existing owner-only trips and accepted viewer invitations continue to work.
- **Technical notes:** Add a shared access helper alongside `requireTripOwner()` and update relevant RLS policies. Preserve compatibility with existing `viewer` and `editor` member rows.
- **Dependencies:** None.

### COLLAB-02: Make itinerary mutations editor-aware

- **Priority:** P0
- **Scope:** Apply the new permission helper to day, event, and marker mutation routes.
- **Acceptance criteria:**
  - An editor can add, edit, reorder, and remove itinerary content.
  - A viewer receives a clear permission error for the same requests.
  - Owner-only routes remain owner-only.
  - Client requests continue to use `getAuthJsonHeaders()`.
  - Scaffold mode remains usable without authentication or persistence.
- **Dependencies:** COLLAB-01.

### COLLAB-03: Add role management to sharing settings

- **Priority:** P0
- **Scope:** Let owners see members and choose whether an invitation or member is an editor or viewer.
- **Acceptance criteria:**
  - The sharing panel displays pending invitations and accepted members separately.
  - Owners can invite someone as an editor or viewer.
  - Owners can change an accepted member's role.
  - Owners can revoke an invitation or remove a member.
  - Non-owners cannot see or use owner-only member controls.
  - The UI explains the capabilities of each role in plain language.
- **Dependencies:** COLLAB-01.

### COLLAB-04: Surface collaboration state in the trip UI

- **Priority:** P1
- **Scope:** Make the current user's access level and editing capability understandable.
- **Acceptance criteria:**
  - Viewers see a clear read-only indicator.
  - Editors see normal editing controls without owner-only settings.
  - Dashboard cards distinguish owned, editable, and view-only trips.
  - Empty and error states explain when access has been revoked.
- **Dependencies:** COLLAB-02, COLLAB-03.

### COLLAB-05: Add ownership transfer

- **Priority:** P2
- **Scope:** Allow an owner to transfer ownership to an accepted member through an explicit confirmation flow.
- **Acceptance criteria:**
  - Transfer is atomic and leaves exactly one owner.
  - The former owner becomes an editor unless they choose to leave.
  - Pending invitees cannot become owners.
  - The action is protected against accidental submission.
- **Dependencies:** COLLAB-03.

**Epic success metrics:** Percentage of shared trips edited by two or more people; collaborator edits per shared trip; invite acceptance-to-first-edit conversion.

---

## Epic 2 — Fast and Reliable Planning UX

**Goal:** Replace full-page reloads with responsive, resilient itinerary editing.

**Why now:** Collaboration increases the frequency of mutations. The editing foundation should be reliable before adding real-time synchronization.

### UX-01: Introduce a consistent mutation state model

- **Priority:** P0
- **Scope:** Standardize loading, success, validation, and retry behavior for trip editor mutations.
- **Acceptance criteria:**
  - Every mutation exposes saving, saved, and failed states.
  - Duplicate submissions are prevented while a request is pending.
  - API errors are shown near the affected control and remain actionable.
  - Failed edits retain the user's input and can be retried.
  - Successful mutations do not reload the page.
- **Dependencies:** None; coordinate its API error shape with COLLAB-02.

### UX-02: Optimistic timeline editing

- **Priority:** P0
- **Scope:** Optimistically add, update, and remove days and events in `timeline-editor.tsx`.
- **Acceptance criteria:**
  - Timeline mutations appear immediately.
  - Confirmed server records replace temporary client records without visual duplication.
  - Failed mutations roll back or show a recoverable unsaved state.
  - Date-based and day-count planning modes both work.
  - Full and condensed timeline views stay consistent.
- **Dependencies:** UX-01.

### UX-03: Optimistic map marker editing

- **Priority:** P0
- **Scope:** Remove full-page reloads from marker creation and deletion.
- **Acceptance criteria:**
  - A new marker appears immediately after selection.
  - Failed saves clearly identify the unsaved marker and offer retry or removal.
  - Duplicate marker submissions are prevented.
  - Owner and editor permissions behave consistently with the timeline.
- **Dependencies:** UX-01, COLLAB-02.

### UX-04: Drag-and-drop itinerary ordering

- **Priority:** P1
- **Scope:** Reorder events within a day and move them between days.
- **Acceptance criteria:**
  - Pointer and keyboard users can reorder events.
  - Ordering persists after refresh.
  - Moving an event updates both its day assignment and order atomically.
  - A failed reorder restores the previous order and displays an error.
  - Public and viewer pages render the persisted order without editing controls.
- **Dependencies:** UX-02; may require a migration for explicit event ordering.

### UX-05: Inline event editing

- **Priority:** P1
- **Scope:** Edit common event fields directly in the timeline with an expanded panel for type-specific metadata.
- **Acceptance criteria:**
  - Common fields can be changed without opening a separate workflow.
  - Unsaved changes are not silently lost.
  - Event-type metadata remains valid when changing event type.
  - Keyboard focus returns to a predictable location after save or cancel.
- **Dependencies:** UX-01, UX-02.

### UX-06: Accessibility and mobile editing pass

- **Priority:** P1
- **Scope:** Verify the complete editing workflow on small screens and with keyboard navigation.
- **Acceptance criteria:**
  - All controls have accessible names and visible focus states.
  - Dialogs and menus manage focus correctly.
  - Reordering has a keyboard-accessible alternative.
  - Core editing works at common mobile viewport widths without horizontal overflow.
- **Dependencies:** UX-02 through UX-05.

**Epic success metrics:** Median time to build one complete day; mutations per session; mutation failure recovery rate; editing-session abandonment.

---

## Epic 3 — Calendar and Portable Itinerary Export

**Goal:** Make a finished TravelTogether itinerary useful outside the application and during the trip.

### EXPORT-01: Define export rules and data mapping

- **Priority:** P0
- **Status:** Delivered
- **Scope:** Specify how itinerary events map to calendar fields across all event types.
- **Acceptance criteria:**
  - The mapping covers title, date, start/end time, location, description, and event-type metadata.
  - All-day and untimed events have deterministic behavior.
  - Trips without calendar dates explain why calendar export is unavailable or offer a clear date-assignment path.
  - Time-zone handling is documented and consistent.
  - Private implementation details and member data are excluded.
- **Dependencies:** None.

### EXPORT-02: Download a trip as an `.ics` calendar

- **Priority:** P0
- **Status:** In progress
- **Scope:** Generate a standards-compatible calendar file for a date-based itinerary.
- **Delivered slice:** Authenticated owners and accepted members can download a dated trip timeline. The generator supports stable UIDs, timed and all-day events, locations, notes, booking links, escaping, UTF-8 line folding, and overnight end times. Sensitive booking references are excluded.
- **Remaining:** Add a sanitized public export path, automated generator/route coverage, and documented manual import verification in Google Calendar, Apple Calendar, and Outlook.
- **Acceptance criteria:**
  - Owners, editors, and viewers with trip read access can export.
  - Public trips can be exported from the public page without exposing private data.
  - The file imports successfully into Apple Calendar, Google Calendar, and Outlook in manual verification.
  - Events have stable identifiers so regenerating an export does not create avoidable duplicates.
  - Special characters, line breaks, and long descriptions are escaped correctly.
  - The export route works in supported deployment environments.
- **Dependencies:** EXPORT-01.

### EXPORT-03: Add export entry points

- **Priority:** P0
- **Status:** In progress
- **Scope:** Add calendar export to the owner/member page and public shared page.
- **Delivered slice:** The owner/member trip page shows an enabled download for exportable timelines and explanatory disabled states for empty timelines, undated trips, and scaffold mode.
- **Remaining:** Add the sanitized public-page entry point and decide whether dashboard cards need an export shortcut.
- **Acceptance criteria:**
  - Export is discoverable near other trip-level actions.
  - The UI explains date or time-zone requirements before download.
  - Loading and failure states are clear.
  - Dashboard cards may offer export only when it does not overcrowd the primary actions.
- **Dependencies:** EXPORT-02.

### EXPORT-04: Export individual events

- **Priority:** P1
- **Scope:** Download or add a single itinerary event to a calendar.
- **Acceptance criteria:**
  - Each dated event has an individual export action.
  - Generated event data matches the full-trip export.
  - Controls are available in editable, viewer, and public read-only contexts.
- **Dependencies:** EXPORT-02.

### EXPORT-05: Print-friendly itinerary

- **Priority:** P1
- **Scope:** Provide a clean print/PDF layout for offline reference.
- **Acceptance criteria:**
  - The print view includes trip details, days, events, and saved places.
  - Editing controls and navigation are omitted.
  - Page breaks do not separate event headings from their core details where avoidable.
  - Private member and invitation information is excluded.
- **Dependencies:** None, but schedule after EXPORT-03.

**Epic success metrics:** Export rate among dated trips; imports per completed trip; return visits after export; public-trip export engagement.

---

## Cross-Cutting Engineering Work

### ENG-01: Permission test matrix

- **Priority:** P0
- Add coverage for unauthenticated users, owners, editors, viewers, removed members, and public visitors across read and mutation routes.
- Verify both cookie-backed and bearer-token authentication paths.

### ENG-02: Preserve schema compatibility

- **Priority:** P0
- Any new fields require a migration, TypeScript updates, API handling, and a deliberate fallback strategy for older deployments.
- Do not remove existing fallback queries unless deployment compatibility is explicitly retired.

### ENG-03: Preserve scaffold mode

- **Priority:** P0
- Every epic must render a useful non-persistent demonstration when Supabase environment variables are absent.
- Disabled actions should explain the scaffold limitation rather than fail unexpectedly.

### ENG-04: End-to-end release verification

- **Priority:** P0
- Verify `/trips/[id]`, `/public/[slug]`, and dashboard cards for each affected feature.
- Run `npm run build` before completing every release slice.

### ENG-05: Product instrumentation

- **Priority:** P1
- Define privacy-conscious events for invite acceptance, first collaborator edit, mutation success/failure, event creation, and calendar export.
- Avoid recording itinerary content, locations, invitee email addresses, or other sensitive trip data in analytics payloads.

---

## Recommended Delivery Sequence

### Release 1 — Shared Planning

COLLAB-01, COLLAB-02, COLLAB-03, ENG-01, ENG-02, ENG-03, ENG-04.

**Exit condition:** An invited editor can safely modify itinerary content, while viewers remain read-only and trip administration remains owner-only.

### Release 2 — Fluid Editing

UX-01, UX-02, UX-03, COLLAB-04, ENG-04, ENG-05.

**Exit condition:** Common timeline and marker mutations complete without a page reload and recover cleanly from failures.

### Release 3 — Planning Polish

UX-04, UX-05, UX-06, ENG-04.

**Exit condition:** A traveler can efficiently build and reorder a complete itinerary on desktop or mobile using pointer or keyboard input.

### Release 4 — Take the Plan With You

EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, EXPORT-05, ENG-04, ENG-05.

**Exit condition:** A dated trip can be exported reliably to major calendars and printed for offline use.

**Current progress:** EXPORT-01 is delivered. Authenticated full-trip ICS download and its trip-page entry point are delivered slices of EXPORT-02 and EXPORT-03; public export, individual-event export, print layout, instrumentation, and cross-calendar manual verification remain.

---

## Later Backlog

These should follow the three roadmap epics rather than compete with their foundations:

- Real-time synchronization and collaborator presence.
- Revision history, attribution, and restore.
- Conflict detection for simultaneous edits.
- Trip photo albums with storage quotas and moderation controls.
- Comments, reactions, and lightweight decision-making on events.
- Notifications for invitations and meaningful itinerary changes.
- Reusable trip templates and itinerary duplication.

Real-time collaboration should begin only after permissions and local mutation state are consistent. Photo workflows should begin only after privacy, storage lifecycle, quotas, and moderation requirements are defined.

## Definition of Done

Every backlog item is complete only when:

- Acceptance criteria are met.
- Authorization is enforced server-side.
- Relevant database, API, TypeScript, and scaffold-mode paths are updated.
- Owner/member, public, and dashboard surfaces are checked when affected.
- Error, loading, empty, and mobile states are handled.
- Accessibility is verified for new interactive controls.
- Automated tests are added or updated in proportion to risk.
- `npm run build` succeeds.
- User-facing behavior is documented if it changes an established workflow.
