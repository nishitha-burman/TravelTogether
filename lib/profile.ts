import type { TripRow } from "@/types/trip";

export function accountTripStats(
  trips: TripRow[],
  userId: string,
  today: string,
) {
  const unique = [...new Map(trips.map((trip) => [trip.id, trip])).values()];
  return {
    total: unique.length,
    created: unique.filter((trip) => trip.owner_id === userId).length,
    collaborations: unique.filter((trip) => trip.owner_id !== userId).length,
    past: unique.filter((trip) => trip.end_date && trip.end_date < today)
      .length,
    upcoming: unique.filter(
      (trip) => trip.start_date && (trip.end_date ?? trip.start_date) >= today,
    ).length,
    datesOpen: unique.filter((trip) => !trip.start_date).length,
  };
}
