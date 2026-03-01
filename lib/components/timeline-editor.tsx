"use client";

import { useMemo, useState } from "react";
import { getAuthJsonHeaders } from "@/lib/client-api";
import { EVENT_TYPES, type DayRow, type EventMeta, type EventRow, type EventType } from "@/types/trip";

type TimelineEditorProps = {
  tripId: string;
  days: DayRow[];
  events: EventRow[];
  planningMode: "days" | "date_range";
};

const eventPrompts: Record<EventType, Array<{ key: string; label: string }>> = {
  stay: [
    { key: "confirmationCode", label: "Confirmation code" },
    { key: "bookingUrl", label: "Booking URL" }
  ],
  museum: [
    { key: "ticketRef", label: "Ticket reference" },
    { key: "bookingUrl", label: "Exhibit URL" }
  ],
  travel: [
    { key: "transportProvider", label: "Carrier" },
    { key: "seatInfo", label: "Seat/Coach" }
  ],
  food: [{ key: "bookingUrl", label: "Reservation URL" }],
  activity: [
    { key: "ticketRef", label: "Ticket reference" },
    { key: "bookingUrl", label: "Activity URL" }
  ],
  custom: [{ key: "bookingUrl", label: "Reference URL" }]
};

type EditableEvent = {
  title: string;
  eventType: EventType;
  startTime: string;
  endTime: string;
  notes: string;
  location: string;
  metadata: EventMeta;
};

function formatDayHeader(day: DayRow, planningMode: "days" | "date_range") {
  if (planningMode !== "date_range" || !day.day_date) {
    return `Day ${day.day_number}${day.label ? ` - ${day.label}` : ""}`;
  }
  const date = new Date(`${day.day_date}T00:00:00Z`);
  const formatted = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  return `Day ${day.day_number} - ${formatted}${day.label ? ` - ${day.label}` : ""}`;
}

export function TimelineEditor({ tripId, days, events, planningMode }: TimelineEditorProps) {
  const [viewMode, setViewMode] = useState<"full" | "condensed">("full");
  const [dayNumber, setDayNumber] = useState(days[0]?.day_number ?? 1);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("activity");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [meta, setMeta] = useState<EventMeta>({});
  const [newDayLabel, setNewDayLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayLabel, setEditingDayLabel] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EditableEvent | null>(null);

  const visibleDays = useMemo(() => {
    if (viewMode === "full") return days;
    const daysWithEvents = new Set(events.map((event) => event.day_id));
    return days.filter((day) => daysWithEvents.has(day.id));
  }, [days, events, viewMode]);

  const eventsByDay = useMemo(() => {
    return events.reduce<Record<string, EventRow[]>>((acc, event) => {
      if (!acc[event.day_id]) acc[event.day_id] = [];
      acc[event.day_id].push(event);
      return acc;
    }, {});
  }, [events]);

  async function addDay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/trips/${tripId}/days`, {
      method: "POST",
      headers: await getAuthJsonHeaders(),
      body: JSON.stringify({ label: newDayLabel })
    });

    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not add day");
      return;
    }

    window.location.reload();
  }

  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const pickedDay = days.find((day) => day.day_number === dayNumber);
    if (!pickedDay) {
      setError("Day not found");
      setSaving(false);
      return;
    }

    const nextMeta: EventMeta = { ...meta };
    if (location.trim()) {
      nextMeta.location = location.trim();
    }

    const response = await fetch(`/api/trips/${tripId}/events`, {
      method: "POST",
      headers: await getAuthJsonHeaders(),
      body: JSON.stringify({
        dayId: pickedDay.id,
        title,
        eventType,
        startTime: startTime || null,
        endTime: endTime || null,
        notes,
        metadata: nextMeta
      })
    });

    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not add event");
      return;
    }

    window.location.reload();
  }

  async function saveDayEdit(dayId: string) {
    const response = await fetch(`/api/trips/${tripId}/days/${dayId}`, {
      method: "PATCH",
      headers: await getAuthJsonHeaders(),
      body: JSON.stringify({ label: editingDayLabel || null })
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not update day");
      return;
    }
    window.location.reload();
  }

  async function deleteDay(dayId: string) {
    const confirmed = window.confirm("Delete this day and all its events?");
    if (!confirmed) return;

    const response = await fetch(`/api/trips/${tripId}/days/${dayId}`, {
      method: "DELETE",
      headers: await getAuthJsonHeaders()
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not delete day");
      return;
    }
    window.location.reload();
  }

  function startEventEdit(event: EventRow) {
    setEditingEventId(event.id);
    setEditingEvent({
      title: event.title,
      eventType: event.event_type,
      startTime: event.start_time ?? "",
      endTime: event.end_time ?? "",
      notes: event.notes ?? "",
      location: (event.metadata?.location as string) ?? "",
      metadata: { ...(event.metadata ?? {}) }
    });
  }

  async function saveEventEdit(eventId: string) {
    if (!editingEvent) return;
    const nextMeta = { ...editingEvent.metadata };
    if (editingEvent.location.trim()) {
      nextMeta.location = editingEvent.location.trim();
    } else {
      delete nextMeta.location;
    }

    const response = await fetch(`/api/trips/${tripId}/events/${eventId}`, {
      method: "PATCH",
      headers: await getAuthJsonHeaders(),
      body: JSON.stringify({
        title: editingEvent.title,
        eventType: editingEvent.eventType,
        startTime: editingEvent.startTime || null,
        endTime: editingEvent.endTime || null,
        notes: editingEvent.notes,
        metadata: nextMeta
      })
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not update event");
      return;
    }
    window.location.reload();
  }

  async function deleteEvent(eventId: string) {
    const confirmed = window.confirm("Delete this event?");
    if (!confirmed) return;

    const response = await fetch(`/api/trips/${tripId}/events/${eventId}`, {
      method: "DELETE",
      headers: await getAuthJsonHeaders()
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Could not delete event");
      return;
    }
    window.location.reload();
  }

  return (
    <section className="space-y-4 rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Timeline</h2>
          <p className="text-sm text-slate-700">Toggle full trip length vs condensed (only active days).</p>
        </div>
        <div className="flex rounded-md border border-[#ffd2e6] bg-slate-50 p-1">
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${viewMode === "full" ? "bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] text-white" : "text-slate-800"}`}
            onClick={() => setViewMode("full")}
          >
            Full
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${viewMode === "condensed" ? "bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] text-white" : "text-slate-800"}`}
            onClick={() => setViewMode("condensed")}
          >
            Condensed
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={addDay} className="space-y-2 rounded-lg border border-[#ffd2e6] bg-white p-4">
          <h3 className="font-semibold text-slate-900">Add day</h3>
          <input
            value={newDayLabel}
            onChange={(event) => setNewDayLabel(event.target.value)}
            placeholder="Optional label (Arrival Day)"
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0] disabled:opacity-60"
          >
            Add day
          </button>
        </form>

        <form onSubmit={addEvent} className="space-y-3 rounded-lg border border-[#ffd2e6] bg-white p-4">
          <h3 className="font-semibold text-slate-900">Add event</h3>
          <select
            value={dayNumber}
            onChange={(event) => setDayNumber(Number(event.target.value))}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          >
            {days.map((day) => (
              <option key={day.id} value={day.day_number}>
                {formatDayHeader(day, planningMode)}
              </option>
            ))}
          </select>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Event title"
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            required
          />

          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location (optional)"
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          />

          <select
            value={eventType}
            onChange={(event) => {
              setEventType(event.target.value as EventType);
              setMeta({});
            }}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            />
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            />
          </div>

          {eventPrompts[eventType].map((prompt) => (
            <input
              key={prompt.key}
              value={(meta[prompt.key] as string) ?? ""}
              onChange={(event) =>
                setMeta((prev) => ({
                  ...prev,
                  [prompt.key]: event.target.value
                }))
              }
              placeholder={prompt.label}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
            />
          ))}

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0] disabled:opacity-60"
          >
            Save event
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {visibleDays.map((day) => (
          <article key={day.id} className="rounded-lg border border-[#ffd2e6] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {editingDayId === day.id ? (
                <div className="flex w-full flex-wrap items-center gap-2">
                  <input
                    value={editingDayLabel}
                    onChange={(event) => setEditingDayLabel(event.target.value)}
                    className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-[#ff6a3d] focus:ring-2 focus:ring-[#ffd2e6]"
                  />
                  <button
                    type="button"
                    className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-3 py-2 text-sm font-semibold text-white"
                    onClick={() => saveDayEdit(day.id)}
                  >
                    Save day
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                    onClick={() => setEditingDayId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h4 className="font-semibold text-slate-900">{formatDayHeader(day, planningMode)}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => {
                        setEditingDayId(day.id);
                        setEditingDayLabel(day.label ?? "");
                      }}
                    >
                      Edit day
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700"
                      onClick={() => deleteDay(day.id)}
                    >
                      Delete day
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-2 space-y-2">
              {(eventsByDay[day.id] ?? []).map((event) => (
                <div key={event.id} className="rounded-md bg-[#fff1f7] p-3 text-sm">
                  {editingEventId === event.id && editingEvent ? (
                    <div className="space-y-2">
                      <input
                        value={editingEvent.title}
                        onChange={(e) => setEditingEvent((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                      <input
                        value={editingEvent.location}
                        onChange={(e) => setEditingEvent((prev) => (prev ? { ...prev, location: e.target.value } : prev))}
                        placeholder="Location (optional)"
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                      <select
                        value={editingEvent.eventType}
                        onChange={(e) =>
                          setEditingEvent((prev) =>
                            prev ? { ...prev, eventType: e.target.value as EventType } : prev
                          )
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      >
                        {EVENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="time"
                          value={editingEvent.startTime}
                          onChange={(e) =>
                            setEditingEvent((prev) => (prev ? { ...prev, startTime: e.target.value } : prev))
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        />
                        <input
                          type="time"
                          value={editingEvent.endTime}
                          onChange={(e) =>
                            setEditingEvent((prev) => (prev ? { ...prev, endTime: e.target.value } : prev))
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                        />
                      </div>
                      <textarea
                        value={editingEvent.notes}
                        onChange={(e) => setEditingEvent((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
                        placeholder="Notes"
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-3 py-2 text-xs font-semibold text-white"
                          onClick={() => saveEventEdit(event.id)}
                        >
                          Save event
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                          onClick={() => {
                            setEditingEventId(null);
                            setEditingEvent(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">{event.title}</p>
                      <p className="text-slate-700">
                        {event.event_type}
                        {event.start_time ? ` • ${event.start_time}` : ""}
                        {event.end_time ? ` - ${event.end_time}` : ""}
                      </p>
                      {(event.metadata?.location as string) ? (
                        <p className="text-slate-700">Location: {event.metadata.location as string}</p>
                      ) : null}
                      {Object.keys(event.metadata || {}).length > 0 ? (
                        <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      ) : null}
                      {event.notes ? <p className="mt-1 text-slate-800">{event.notes}</p> : null}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          onClick={() => startEventEdit(event)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700"
                          onClick={() => deleteEvent(event.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(eventsByDay[day.id] ?? []).length === 0 ? <p className="text-sm text-slate-700">No events yet.</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
