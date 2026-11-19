export type TripRole = "owner" | "editor" | "viewer";
export function canEditContent(role: TripRole | null) {
  return role === "owner" || role === "editor";
}
export function canManageTrip(role: TripRole | null) {
  return role === "owner";
}
