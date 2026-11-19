"use client";
import { useState } from "react";
import { EVENT_TYPES, type EventRow, type EventType, type EventMeta, type DayRow } from "@/types/trip";
import { dateLabel } from "@/lib/calendar/time";
export const eventPrompts: Record<EventType, Array<{ key: string; label: string }>> = {
  stay: [
    { key: "confirmationCode", label: "Confirmation code" },
    { key: "bookingUrl", label: "Booking link" },
  ],
  museum: [
    { key: "ticketRef", label: "Ticket reference" },
    { key: "bookingUrl", label: "Exhibit link" },
  ],
  travel: [
    { key: "transportProvider", label: "Carrier" },
    { key: "seatInfo", label: "Seat or coach" },
  ],
  food: [{ key: "bookingUrl", label: "Reservation link" }],
  activity: [
    { key: "ticketRef", label: "Ticket reference" },
    { key: "bookingUrl", label: "Activity link" },
  ],
  custom: [{ key: "bookingUrl", label: "Reference link" }],
};
export type EventPayload = {
  dayId?: string;
  title: string;
  eventType: EventType;
  startTime: string | null;
  endTime: string | null;
  notes: string;
  metadata: EventMeta;
};
type Props = {
  event?: EventRow;
  days?: DayRow[];
  defaultDayId?: string;
  saving: boolean;
  disabled?: boolean;
  onSave: (body: EventPayload) => Promise<boolean>;
  onCancel: () => void;
};
export function EventForm({ event, days, defaultDayId, saving, disabled, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [type, setType] = useState<EventType>(event?.event_type ?? "activity");
  const [dayId, setDayId] = useState(defaultDayId ?? days?.[0]?.id ?? "");
  const [start, setStart] = useState(event?.start_time ?? "");
  const [end, setEnd] = useState(event?.end_time ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [location, setLocation] = useState(String(event?.metadata?.location ?? ""));
  const [meta, setMeta] = useState<EventMeta>(event?.metadata ?? {});
  return (
    <form
      className="space-y-4 rounded-md border border-[var(--line)] bg-white p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          ...(days ? { dayId } : {}),
          title,
          eventType: type,
          startTime: start || null,
          endTime: end || null,
          notes,
          metadata: { ...meta, location: location.trim() },
        });
      }}
    >
      <h3 className="font-semibold">{event ? "Edit event" : "Add to the itinerary"}</h3>
      <fieldset disabled={saving} className="space-y-4">
        {days ? (
          <label className="field-label">
            Day
            <select className="field" value={dayId} onChange={(e) => setDayId(e.target.value)}>
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  Day {d.day_number}
                  {d.day_date ? ` · ${dateLabel(d.day_date)}` : ""}
                  {d.label ? ` · ${d.label}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="field-label">
            Event title
            <input
              autoFocus
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              placeholder="Dinner in the old town"
            />
          </label>
          <label className="field-label">
            Category
            <select className="field" value={type} onChange={(e) => setType(e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field-label">
          Place
          <input
            className="field"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Place name or address"
            maxLength={2000}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="field-label">
            Start time
            <input
              className="field"
              type="time"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (!e.target.value) setEnd("");
              }}
            />
          </label>
          <label className="field-label">
            End time
            <input
              className="field"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={!start}
            />
          </label>
        </div>
        <p className="text-xs muted">
          Leave times empty for an all-day event. An earlier or equal end time means the next day. Without an
          end time, calendars use one hour.
        </p>
        <details>
          <summary className="text-sm font-medium">Notes & booking details · group only</summary>
          <div className="mt-3 space-y-3">
            {eventPrompts[type].map((p) => (
              <label key={p.key} className="field-label">
                {p.label}
                <input
                  type={p.key === "bookingUrl" ? "url" : "text"}
                  className="field"
                  value={String(meta[p.key] ?? "")}
                  maxLength={2000}
                  onChange={(e) => setMeta({ ...meta, [p.key]: e.target.value })}
                />
              </label>
            ))}
            <label className="field-label">
              Notes
              <textarea
                className="field"
                rows={3}
                maxLength={10000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <p className="text-xs muted">
              Visible to invited travelers. Excluded from public pages and calendar downloads.
            </p>
          </div>
        </details>
        <div className="flex gap-3">
          <button className="button" disabled={disabled || saving}>
            {saving ? "Saving…" : "Save event"}
          </button>
          <button className="button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
