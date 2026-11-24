# Product Context

TravelTogether helps a small group build one shared itinerary and carry a dated copy in each traveler’s calendar. The shared plan remains the source of truth. v1.4 delivers the collaboration, privacy and calendar-readiness foundation; automatically updating subscription feeds are the next release.

## Current journey

- Accounts use Supabase Auth. Every created trip belongs to its creator’s account; accepted invitations add editor/viewer access to other trips. **Profile** in the header opens the private account page, with display name, home city, bio, email, account join date, and upcoming trip links.
- Profile statistics count current owned trips, accepted collaborations, past trips by scheduled end date, and upcoming/active trips. Counts deduplicate trip IDs and exclude pending invitations and public-only browsing. Past trips do not assert actual attendance; deleting trips or losing membership can reduce counts.
- Profile supports a private photo (JPG/PNG/WebP up to 2 MB), editable name, home city and bio. Email changes use a separate sign-in email form and Supabase confirmation instructions; the account ID and its trips remain unchanged. The current email remains displayed until Auth confirms the change. Photo/email controls are disabled in scaffold mode.
- Sign up/login with Supabase Auth. Create a trip with a destination and a day count or date range; timezone can be chosen now or later.
- Owners invite editors or viewers by email. Invitations are accepted atomically when a confirmed matching account opens the dashboard. The app does not send invitation emails.
- Owners edit a trip’s title and switch between a number of days and actual dates using **Edit trip** on the dashboard or trip page. Title-only edits preserve all day dates. Schedule changes keep existing events on their days, add empty days when extending, and block shortening if a removed day contains events. Owners can delete from either surface after confirmation.
- Owners and editors add/edit/delete days, events and saved places. Owners alone control visibility, membership and deletion. Viewers read the private group itinerary and download its calendar.
- Trip sections use tabs: Itinerary, Calendar, Saved places, and owner-only Travelers & sharing. Arrow keys, Home and End navigate tabs; visited panels retain unfinished form input.
- Calendar shows a weekly date grid with all-day and timed events, category colors, week navigation and explicit overnight labels. Undated days remain undated. Private calendar downloads and date/timezone controls appear below the grid; public calendars use sanitized data.
- Timeline editing uses progressive forms, readable booking details and saving/error/saved states. Server refreshes replace full document reloads and retain failed input.
- Dated day headings, trip date ranges, dashboard trip starts and event day choices show abbreviated weekdays. A day's Add event opens its form inside that day and returns focus there after save/cancel; the itinerary-wide Add event retains its day selector.
- Set a start date and trip timezone in Calendar to assign dates to all days. Deleting a day does not shift other bookings; explicitly assigning a start date does.
- Calendar readiness identifies missing events, dates, timezone or invalid/ambiguous clock-change times. Ready trips export timezone-correct `.ics` snapshots for each authorized traveler.
- A snapshot is one-time and does not update after import. Calendar output excludes notes and booking details. Do not describe it as sync.
- Public link pages are sanitized, read-only documents. Only explicitly listed public fields are exposed by a database RPC; raw event/member tables are private.

## Product direction and limits

The UI uses restrained typography, warm paper, dark green text, simple controls and itinerary-first hierarchy. The current product version is v1.4.1, manually rendered in `app/layout.tsx` and incremented with each user-facing release. Dashboard separates dated, undated and past trips and shows role, readiness and update date.

Scaffold mode uses the real workspace components with sample Honolulu/Kyoto plans. Owner/editor/viewer previews work; persistence and downloads are disabled. No external service is required for core rendering; maps and images require network access.

Still out of scope: subscriptions, direct Google/Microsoft connections, public/individual calendar export, two-way sync, multiple timezones per event, multi-day all-day events, realtime presence and conflict resolution. Edits currently use last-write-wins; no claim of realtime updates is made. See [calendar decision](CALENDAR_DELIVERY_ADR.md) and [release audit](RELEASE_AUDIT.md).

Untimed events retain the order they were added within each day; timed events remain chronological. Editing an event does not move its position.
