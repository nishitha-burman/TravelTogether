# Shared planning → calendar-ready itinerary

## Evidence from the starting checkout

- The landing page promises granular permissions, but all content mutations call `requireTripOwner`. The trip page renders owner controls to every reader; dashboard cards offer deletion even for members.
- `can_access_itinerary` includes `is_public`, so raw events (notes and arbitrary booking metadata) and membership rows can be queried by anonymous clients. The public server page also selects notes. This is a database boundary problem, not a rendering fix.
- Invitations are always viewers; acceptance uses two unchecked writes and cannot insert membership under existing RLS.
- Day append/delete and trip creation perform independent writes. Delete renumbering can collide with the unique day-number constraint. Events can reference a day from another trip.
- Calendar download has stable UIDs and UTF-8 folding, but floating times, no revision fields, no readiness repair path, and no bearer-aware download/error handling. Undated trips cannot graduate into dated trips.
- Timeline/map mutations reload the document, failed network requests can strand saving state, metadata is printed as JSON, and the map precedes the itinerary.
- Scaffold pages use separate, shallow mock layouts, so they do not exercise the real workspace. The global shell uses repeated gradients, inline styles, and an oversized wordmark.

## Release boundary

Deliver the private/public boundary, owner/editor/viewer collaboration, transactional day operations, explicit timezone and date assignment, trustworthy snapshot generation, and a shared responsive document layout. Keep subscriptions and provider connections out of customer controls until complete. Preserve auth methods, legacy schema reads, day-count planning, existing metadata, and the manual header version.

## Phases and exit criteria

1. **Trust:** sanitized public RPC; private raw tables; editor content writes; owner administration; atomic invitations/day operations and cross-trip integrity; database permission tests.
2. **Editing:** timeline first, progressive forms, readable metadata, pending/error/saved states, refresh without document reload, accessible controls and useful scaffold fixtures.
3. **Readiness:** explicit IANA timezone, assign dates to existing days atomically, shared readiness rules used by UI/API.
4. **Delivery:** timezone-correct one-time snapshots now; per-traveler revocable subscription feeds next, with tombstones and polling semantics tested before launch.
5. **Providers:** encrypted per-user credentials, provider adapters, durable outbox/retries, visible connection health. Requires provider registration and secret infrastructure.
6. **Collaboration evolution:** revision conflict handling, realtime reconciliation and history after local mutation reliability.

## Deployment stance

Database changes ship as ordered migrations, not modifications to a remote database during this session. Public reads fail closed if the sanitized RPC is missing; legacy private queries remain supported. Security-sensitive new mutations must report an unavailable capability rather than silently discard fields on an old schema. Actual live auth/provider checks require a disposable configured test environment.
