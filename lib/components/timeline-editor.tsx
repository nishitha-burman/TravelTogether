"use client";

import { useMemo, useState } from "react";
import { getAuthJsonHeaders } from "@/lib/client-api";
import { EVENT_TYPES, type DayRow, type EventMeta, type EventRow, type EventType } from "@/types/trip";

type TimelineEditorProps = {
  tripId: string;
  days: DayRow[];
  events: EventRow[];
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

export function TimelineEditor({ tripId, days, events }: TimelineEditorProps) {
  const [viewMode, setViewMode] = useState<"full" | "condensed">("full");
  const [dayNumber, setDayNumber] = useState(days[0]?.day_number ?? 1);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("activity");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [meta, setMeta] = useState<EventMeta>({});
  const [newDayLabel, setNewDayLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleDays = useMemo(() => {
    if (viewMode === "full") return days;

    const daysWithEvents = new Set(events.map((event) => event.day_id));
    return days.filter((day) => daysWithEvents.has(day.id));
  }, [days, events, viewMode]);

  const eventsByDay = useMemo(() => {
    return events.reduce<Record<string, EventRow[]>>((acc, event) => {
      if (!acc[event.day_id]) {
        acc[event.day_id] = [];
      }
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
        metadata: meta
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

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Timeline</h2>
          <p className="text-sm text-slate-600">Toggle full trip length vs condensed (only active days).</p>
        </div>
        <div className="flex rounded-md border border-slate-300 p-1">
          <button
            className={`rounded px-3 py-1 text-sm ${viewMode === "full" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            onClick={() => setViewMode("full")}
          >
            Full
          </button>
          <button
            className={`rounded px-3 py-1 text-sm ${viewMode === "condensed" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            onClick={() => setViewMode("condensed")}
          >
            Condensed
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={addDay} className="space-y-2 rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">Add day</h3>
          <input
            value={newDayLabel}
            onChange={(event) => setNewDayLabel(event.target.value)}
            placeholder="Optional label (Arrival Day)"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            Add day
          </button>
        </form>

        <form onSubmit={addEvent} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">Add event</h3>
          <select
            value={dayNumber}
            onChange={(event) => setDayNumber(Number(event.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {days.map((day) => (
              <option key={day.id} value={day.day_number}>
                Day {day.day_number} {day.label ? `- ${day.label}` : ""}
              </option>
            ))}
          </select>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Event title"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            required
          />

          <select
            value={eventType}
            onChange={(event) => {
              setEventType(event.target.value as EventType);
              setMeta({});
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          ))}

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            Save event
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {visibleDays.map((day) => (
          <article key={day.id} className="rounded-lg border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-900">
              Day {day.day_number} {day.label ? `- ${day.label}` : ""}
            </h4>
            <div className="mt-2 space-y-2">
              {(eventsByDay[day.id] ?? []).map((event) => (
                <div key={event.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{event.title}</p>
                  <p className="text-slate-600">
                    {event.event_type}
                    {event.start_time ? ` • ${event.start_time}` : ""}
                    {event.end_time ? ` - ${event.end_time}` : ""}
                  </p>
                  {Object.keys(event.metadata || {}).length > 0 ? (
                    <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  ) : null}
                  {event.notes ? <p className="mt-1 text-slate-700">{event.notes}</p> : null}
                </div>
              ))}
              {(eventsByDay[day.id] ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No events yet.</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
