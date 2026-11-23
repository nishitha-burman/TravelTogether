export const EVENT_TYPES = ["stay", "museum", "travel", "food", "activity", "custom"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type EventMeta = {
  ticketRef?: string;
  confirmationCode?: string;
  transportProvider?: string;
  seatInfo?: string;
  bookingUrl?: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type TripRow = {
  id: string;
  owner_id: string;
  title: string;
  city: string;
  destination: string;
  theme_image_url: string | null;
  is_public: boolean;
  public_slug: string;
  planning_mode: "days" | "date_range";
  start_date: string | null;
  end_date: string | null;
  trip_length_days: number;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
};

export type DayRow = {
  id: string;
  itinerary_id: string;
  day_number: number;
  label: string | null;
  day_date: string | null;
};

export type EventRow = {
  updated_at?: string;
  sequence?: number;
  id: string;
  itinerary_id: string;
  day_id: string;
  title: string;
  event_type: EventType;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  metadata: EventMeta;
};

export type MarkerRow = {
  id: string;
  itinerary_id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
};

export type InviteRow = {
  id: string;
  itinerary_id: string;
  invited_email: string;
  invited_by: string;
  accepted_at: string | null;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  home_city: string | null;
  bio: string | null;
  created_at: string;
};
