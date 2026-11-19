import type { TripRow, DayRow, EventRow, MarkerRow } from "@/types/trip";
export const honoluluPreviewNote =
  "November 4–8, 2026 · Recreated from trip memories. Saturday’s stops are grouped together; other day placements are tentative. Times weren’t supplied, so entries display as all-day.";
export function demoTrip(id = "demo-honolulu") {
  const undated = id === "demo-kyoto";
  const trip: TripRow = {
    id,
    owner_id: "demo-owner",
    title: undated ? "A few days in Kyoto" : "Five days in Honolulu",
    destination: undated ? "Kyoto, Japan" : "Honolulu, Hawaii",
    city: undated ? "Kyoto" : "Honolulu",
    theme_image_url: undated
      ? null
      : // Waikiki by Blake Wisz: https://unsplash.com/photos/ZHl2BhtEYX0
        "https://images.unsplash.com/photo-1779636813904-7900421432f6?q=80&w=1200&auto=format&fit=crop",
    is_public: !undated,
    public_slug: "demo-honolulu",
    planning_mode: undated ? "days" : "date_range",
    start_date: undated ? null : "2026-11-04",
    end_date: undated ? null : "2026-11-08",
    timezone: undated ? null : "Pacific/Honolulu",
    trip_length_days: undated ? 3 : 5,
    created_at: "2026-11-16T12:00:00Z",
    updated_at: "2026-11-16T12:00:00Z",
  };
  const labels = undated
    ? ["", "", ""]
    : [
        "Arrive & settle into Waikiki",
        "Beach, poke & malasadas",
        "Pearl Harbor & USS Arizona",
        "Scones, the market & Diamond Head",
        "Aloha, Honolulu",
      ];
  const days: DayRow[] = labels.map((label, i) => ({
    id: `${id}-day-${i}`,
    itinerary_id: id,
    day_number: i + 1,
    label: undated ? null : label,
    day_date: undated ? null : `2026-11-0${i + 4}`,
  }));
  // These are the traveler's stops; only Saturday's day placement was specified.
  // Untimed entries use the app's all-day representation, not invented booking times.
  const tentative =
    "Tentative day placement; exact date and time not provided.";
  const events: EventRow[] = undated
    ? []
    : ([
        {
          id: "01-hyatt",
          day_id: days[0].id,
          title: "Stay at Hyatt Regency Waikiki",
          event_type: "stay",
          metadata: { location: "Hyatt Regency Waikiki Beach Resort and Spa" },
          notes:
            "Honolulu stay, November 4–8. Hotel name assumed from Hyatt Regency; check-in time not provided.",
        },
        {
          id: "02-waikiki",
          day_id: days[1].id,
          title: "Waikiki Beach",
          event_type: "activity",
          metadata: { location: "Waikiki Beach" },
          notes: tentative,
        },
        {
          id: "03-maguro",
          day_id: days[1].id,
          title: "Poke at Maguro Spot",
          event_type: "food",
          metadata: { location: "Maguro Spot" },
          notes: tentative,
        },
        {
          id: "04-leonards",
          day_id: days[1].id,
          title: "Malasadas at Leonard’s Bakery",
          event_type: "food",
          metadata: { location: "Leonard’s Bakery" },
          notes: `Really good malasadas. ${tentative}`,
        },
        {
          id: "05-pearl-harbor",
          day_id: days[2].id,
          title: "Visit Pearl Harbor",
          event_type: "museum",
          metadata: { location: "Pearl Harbor" },
          notes: tentative,
        },
        {
          id: "06-uss-arizona",
          day_id: days[2].id,
          title: "USS Arizona Memorial",
          event_type: "museum",
          metadata: { location: "Pearl Harbor" },
          notes: `Got tickets to see the USS Arizona. Reservation time and ticket reference not provided. ${tentative}`,
        },
        {
          id: "07-scones",
          day_id: days[3].id,
          title: "Scones at Diamond Head Market & Grill",
          event_type: "food",
          metadata: { location: "Diamond Head Market & Grill" },
          notes:
            "Really good scones on the way to Diamond Head. Time and order of the morning stops not provided.",
        },
        {
          id: "08-farmers-market",
          day_id: days[3].id,
          title: "Saturday farmers market",
          event_type: "activity",
          metadata: { location: "Near Diamond Head" },
          notes:
            "Visited on Saturday on the way to Diamond Head. Exact market and time not specified.",
        },
        {
          id: "09-diamond-head",
          day_id: days[3].id,
          title: "Visit Diamond Head",
          event_type: "activity",
          metadata: { location: "Diamond Head" },
          notes:
            "Had to get tickets for this visit. Reservation time and ticket reference not provided.",
        },
      ].map((e) => ({
        ...e,
        itinerary_id: id,
        start_time: null,
        end_time: null,
        sequence: 0,
        updated_at: trip.updated_at,
      })) as EventRow[]);
  const markers: MarkerRow[] = undated
    ? []
    : [
        {
          id: "waikiki",
          itinerary_id: id,
          name: "Waikiki Beach",
          description: "Beach stop · approximate area pin",
          latitude: 21.276,
          longitude: -157.827,
        },
        {
          id: "pearl-harbor",
          itinerary_id: id,
          name: "Pearl Harbor Visitor Center",
          description: "USS Arizona visit · approximate area pin",
          latitude: 21.367,
          longitude: -157.938,
        },
        {
          id: "diamond-head",
          itinerary_id: id,
          name: "Diamond Head",
          description: "Saturday visit · approximate area pin",
          latitude: 21.262,
          longitude: -157.806,
        },
      ];
  return { trip, days, events, markers };
}
