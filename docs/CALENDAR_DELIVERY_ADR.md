# ADR: the shared plan is the source of truth

Status: accepted for v1.4. Snapshot delivery implemented; subscriptions and provider connections deliberately not exposed.

## Delivery contracts

| Delivery | Ownership | Changes in TravelTogether |
| --- | --- | --- |
| `.ics` download (implemented) | Each owner, editor or viewer downloads independently | Existing imported copies do not update; another import can duplicate events depending on the client |
| Subscription (next release) | A revocable, per-user, per-trip bearer capability | One-way feed, polled by the calendar client; refresh is not instant |
| Direct provider connection (later) | Each user authorizes their own provider account | Durable jobs push changes and track per-user delivery status |

No shared OAuth credentials, no external-calendar writes back to TravelTogether, and no imaginary connection status in this release.

## Implemented semantics

- `itineraries.timezone` is an explicit IANA zone. Existing trips remain null rather than guessing from the owner’s device. Creation offers a small set of destination suggestions; all selections remain editable. Unsupported destinations need explicit selection.
- `assign_trip_dates` atomically assigns consecutive dates to all days and updates the trip range/timezone. It deliberately replaces existing dates. Deleting a day preserves other days’ actual dates; appending starts after the last date. Gaps are allowed until explicit reassignment.
- No start time means a one-day all-day event, with an exclusive next-day end. Timed events without an end last one elapsed hour. End time less than or equal to start time means the following day in the trip timezone.
- Temporal converts timed entries into UTC instants. Ambiguous and nonexistent local times during daylight-saving transitions block readiness and name the affected event; the product does not silently guess an offset.
- The event UUID is the stable `UID` (`<id>@traveltogether.app`). Database triggers increment `sequence` and set `updated_at` after an event edit or a change to its day date or trip timezone. Those map to `SEQUENCE` and `LAST-MODIFIED`; `DTSTAMP` is generation time. Stable UIDs do **not** guarantee duplicate-free imports in every client.
- Deleting an event/day removes the event from subsequent snapshots. A downloaded copy cannot be remotely deleted or cancelled. No subscription cancellation guarantee is claimed.
- Download is authenticated with cookies or bearer headers and explicitly checks membership, even with legacy public-inclusive RLS. Errors use 401 (no identity), 403 (no membership), 422 (not ready), or 500 (read/generation failure). Downloads are `private, no-store`.
- Calendar projection includes title, category, date/time and `metadata.location` only. Group notes, all booking URLs, confirmation codes, ticket references, seats and traveler records are excluded. This is intentionally stricter than v1.3.
- Public pages use only `get_public_itinerary(slug)`: title, cover, destination, timezone, dates, day labels, event titles/types/times and saved place names/coordinates. Private notes, raw metadata, member/owner identity and marker descriptions are never returned. The public UI shows place names and map links, not coordinates. The missing-RPC path fails closed; public export is not implemented.

## Next release: real subscriptions

1. Add `calendar_subscriptions(id, user_id, itinerary_id, token_hash, created_at, revoked_at, last_fetched_at)`, owner-scoped RLS and one active capability per traveler/trip. Mint 256-bit random tokens server-side, persist only their SHA-256 digest, show the complete URL only at creation, redact tokens from logs, and allow independent revocation/replacement.
2. Add an event deletion journal keyed by stable UUID. Record a tombstone with higher sequence, deletion time and original time bounds for event, day and trip deletion. Prevent deleting a day from losing the data needed to produce cancellations. Define retention against the supported polling window before launch.
3. Build a minimal feed RPC that validates token hash, revocation and **current** owner/member access on every request, then returns only the calendar projection. Do not make private raw tables anonymous-readable and do not reuse public sharing slugs as capabilities. Removed travelers lose feed access immediately; turning public sharing off is independent of a private member subscription.
4. Return active and cancelled VEVENTs with deterministic ordering and safe ETags. Exercise client removal/cancellation behavior in Apple, Google and Outlook. A failed/partial read must return an error, never an empty successful calendar that could erase a subscriber’s schedule.
5. UI: create/copy subscription, explain polling delays and the sensitivity of the link, show last successful **fetch** (not a claim that a device synced), revoke, and keep the one-time snapshot action distinct.

## Provider boundary and failure handling

Provider work requires registered OAuth applications, encrypted credential storage or a managed token vault, secret rotation, and a durable queue. Store one connection per user/provider; scope calendar mappings by connection + trip + event UID, with provider event ID, last delivered sequence, status, retry count and safe error code. An idempotent outbox sends create/update/cancel work; bounded exponential retries handle transient errors, revoked authorization requires reconnect, and individual failures must not mark the whole trip synced. Never persist credentials in itinerary metadata, browser storage or plaintext application tables.

This release has explicit saving/error states, retains failed form input, and refreshes the authoritative server view after successful writes. There are no background sync jobs or automatic retries of potentially successful writes. If the connection is lost after submission, users are told to check the itinerary before retrying. Multi-zone legs, multi-day events, provider credentials, subscription tokens/tombstones, realtime updates and conflict history remain out of scope.

References: [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html), [Supabase function security](https://supabase.com/docs/guides/database/functions), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
