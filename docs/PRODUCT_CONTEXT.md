# Product Context

## Product Summary
TravelTogether is a collaborative itinerary planning app for small groups traveling together. The goal is to keep the trip plan, key places, and day-by-day schedule in one shared workspace that is simple enough to use during planning and during the trip itself.

## Primary User Journeys
- Sign up or log in with email/password.
- Create an itinerary for a destination.
- Choose either:
  - planning by number of days
  - planning by calendar date range
- Add a hero image by URL or file upload.
- Keep the trip private, or make it public with a shareable link.
- Invite specific people by email for private trips.
- Add map markers for places worth saving.
- Build a day-by-day timeline with categorized events.

## Current Product Behavior
- Auth is powered by Supabase Auth.
- The dashboard shows trips the user owns plus trips they were invited to.
- Private sharing is modeled through `itinerary_invites` and `itinerary_members`.
- Public sharing uses `/public/[slug]`.
- Timeline events support typed metadata for different event kinds such as `stay`, `museum`, `travel`, `food`, `activity`, and `custom`.
- Destination lookup and map search use the app's location search API.

## Current Limitations
- Collaboration is only partially implemented:
  - invites and shared access exist
  - most write endpoints still require trip ownership
- Several client interactions still use full-page reloads after mutations.
- Schema compatibility fallbacks remain in place for older deployments.
- There is no real-time sync, conflict resolution, or change history yet.

## UX Direction
- The app leans warm, bright, and travel-editorial rather than enterprise dashboard.
- The header contains a visible manual version label under the `TravelTogether` title.
- Scaffold mode should still feel usable for frontend iteration even without Supabase configured.

## Planned or Natural Next Steps
- True collaborator editing permissions
- Calendar export
- Better mutation UX with optimistic updates
- Photo workflows and moderation
- Real-time collaboration and revision history
