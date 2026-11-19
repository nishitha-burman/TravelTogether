"use client";
import { useRef, useState } from "react";
import { dateLabel } from "@/lib/calendar/time";
import { useTripMutation } from "@/lib/components/use-trip-mutation";
import { EventForm, eventPrompts } from "@/lib/components/event-form";
import type { DayRow, EventRow } from "@/types/trip";
type Props = {
  tripId: string;
  days: DayRow[];
  events: EventRow[];
  canEdit?: boolean;
  scaffold?: boolean;
  timezone?: string | null;
};
export function TimelineEditor({ tripId, days, events, canEdit = false, scaffold = false, timezone }: Props) {
  const [condensed, setCondensed] = useState(false);
  const [addToDay, setAddToDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dayLabel, setDayLabel] = useState("");
  const [newDay, setNewDay] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const { mutate, saving, error, status } = useTripMutation();
  const disabled = saving || scaffold;
  function focusHeading() {
    requestAnimationFrame(() => heading.current?.focus());
  }
  const visibleDays = condensed ? days.filter((d) => events.some((e) => e.day_id === d.id)) : days;
  return (
    <section id="itinerary" aria-labelledby="timeline-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 ref={heading} tabIndex={-1} id="timeline-heading" className="section-heading">
            The itinerary
          </h2>
          <p className="mt-1 text-sm muted">
            {timezone
              ? `Local times in ${timezone.replaceAll("_", " ")}`
              : "Start with places and ideas. Dates can follow."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={condensed} onChange={(e) => setCondensed(e.target.checked)} />
            Hide empty days
          </label>
          {canEdit ? (
            <button
              className="button-secondary"
              disabled={saving || !days.length}
              onClick={() => setAddToDay(days[0]?.id ?? null)}
            >
              Add event
            </button>
          ) : null}
        </div>
      </div>
      {scaffold && canEdit ? (
        <p className="status">Explore the editing forms. Changes are not saved in this sample trip.</p>
      ) : null}
      <div role="status" className="status">
        {status}
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {canEdit && addToDay ? (
        <EventForm
          key={addToDay}
          days={days}
          defaultDayId={addToDay}
          saving={saving}
          disabled={scaffold}
          onCancel={() => {
            setAddToDay(null);
            focusHeading();
          }}
          onSave={(body) =>
            mutate(`/api/trips/${tripId}/events`, "POST", body, () => {
              setAddToDay(null);
              focusHeading();
            })
          }
        />
      ) : null}
      <div className="space-y-8">
        {visibleDays.map((day) => {
          const entries = events
            .filter((e) => e.day_id === day.id)
            .sort(
              (a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? "") || a.id.localeCompare(b.id),
            );
          return (
            <article key={day.id} className="border-t border-[var(--line)] pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    Day {day.day_number}
                    {day.day_date ? ` / ${dateLabel(day.day_date)}` : ""}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl">{day.label || "An open day"}</h3>
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    <button className="text-button" onClick={() => setAddToDay(day.id)} disabled={saving}>
                      Add event<span className="sr-only"> to day {day.day_number}</span>
                    </button>
                    <details className="relative">
                      <summary className="px-2 py-2 text-sm" aria-label={`Options for day ${day.day_number}`}>
                        Day options
                      </summary>
                      <div className="absolute right-0 z-10 w-48 rounded-md border bg-white p-2 shadow-md">
                        <button
                          className="text-button w-full text-left"
                          disabled={saving}
                          onClick={() => {
                            setEditingDay(day.id);
                            setDayLabel(day.label ?? "");
                          }}
                        >
                          Rename day
                        </button>
                        <button
                          className="text-button w-full text-left text-red-800"
                          disabled={disabled || days.length <= 1}
                          onClick={() => {
                            if (
                              window.confirm("Delete this day and its events? Other days keep their dates.")
                            )
                              void mutate(
                                `/api/trips/${tripId}/days/${day.id}`,
                                "DELETE",
                                undefined,
                                focusHeading,
                              );
                          }}
                        >
                          Delete day
                        </button>
                      </div>
                    </details>
                  </div>
                ) : null}
              </div>
              {canEdit && editingDay === day.id ? (
                <form
                  className="mt-4 flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void mutate(`/api/trips/${tripId}/days/${day.id}`, "PATCH", { label: dayLabel }, () => {
                      setEditingDay(null);
                      focusHeading();
                    });
                  }}
                >
                  <label className="field-label flex-1">
                    Day label
                    <input
                      className="field"
                      autoFocus
                      value={dayLabel}
                      onChange={(e) => setDayLabel(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <button disabled={disabled} className="button">
                    Save day
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setEditingDay(null);
                      focusHeading();
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : null}
              <div className="mt-4 divide-y divide-[var(--line)]">
                {entries.map((event) => (
                  <div key={event.id} className="py-4">
                    {canEdit && editing === event.id ? (
                      <EventForm
                        event={event}
                        saving={saving}
                        disabled={scaffold}
                        onCancel={() => {
                          setEditing(null);
                          focusHeading();
                        }}
                        onSave={(body) =>
                          mutate(`/api/trips/${tripId}/events/${event.id}`, "PATCH", body, () => {
                            setEditing(null);
                            focusHeading();
                          })
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[6rem_1fr_auto]">
                        <div className="pt-0.5 text-sm tabular-nums">
                          <p>{event.start_time?.slice(0, 5) || "All day"}</p>
                          {event.end_time ? (
                            <p className="mt-1 text-xs muted">
                              to {event.end_time.slice(0, 5)}
                              {event.start_time && event.end_time <= event.start_time ? " +1 day" : ""}
                            </p>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <h4 className="break-words font-semibold">{event.title}</h4>
                          <p className="mt-1 text-sm muted">
                            {event.event_type[0].toUpperCase() + event.event_type.slice(1)}
                            {typeof event.metadata?.location === "string" && event.metadata.location
                              ? ` · ${event.metadata.location}`
                              : ""}
                          </p>
                          {event.notes ||
                          eventPrompts[event.event_type].some((p) => event.metadata[p.key]) ? (
                            <details className="mt-2">
                              <summary className="text-xs muted">Group notes & booking details</summary>
                              <div className="mt-2 space-y-2 text-sm">
                                {event.notes ? (
                                  <p className="whitespace-pre-wrap break-words">{event.notes}</p>
                                ) : null}
                                <dl className="space-y-1">
                                  {eventPrompts[event.event_type]
                                    .filter((p) => event.metadata[p.key])
                                    .map((p) => (
                                      <div key={p.key} className="break-words">
                                        <dt className="inline muted">{p.label}: </dt>
                                        <dd className="inline">{String(event.metadata[p.key])}</dd>
                                      </div>
                                    ))}
                                </dl>
                              </div>
                            </details>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <div className="col-start-2 flex gap-2 sm:col-start-auto">
                            <button
                              className="text-button"
                              disabled={saving}
                              onClick={() => setEditing(event.id)}
                              aria-label={`Edit ${event.title}`}
                            >
                              Edit
                            </button>
                            <details className="relative">
                              <summary
                                className="px-2 py-2 text-sm"
                                aria-label={`More actions for ${event.title}`}
                              >
                                More
                              </summary>
                              <div className="absolute right-0 z-10 w-36 border bg-white p-2 shadow-md">
                                <button
                                  className="text-button text-red-800"
                                  disabled={disabled}
                                  onClick={() => {
                                    if (window.confirm(`Delete “${event.title}”?`))
                                      void mutate(
                                        `/api/trips/${tripId}/events/${event.id}`,
                                        "DELETE",
                                        undefined,
                                        focusHeading,
                                      );
                                  }}
                                >
                                  Delete event
                                </button>
                              </div>
                            </details>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
                {!entries.length ? (
                  <p className="py-4 text-sm muted">
                    Nothing planned yet. Leave space to explore{canEdit ? ", or add an event above" : ""}.
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {!visibleDays.length ? (
        <p className="status">
          No days to show{condensed ? ". Uncheck “Hide empty days” to see the whole trip" : ""}.
        </p>
      ) : null}
      {canEdit ? (
        <div className="border-t border-[var(--line)] pt-5">
          {newDay ? (
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void mutate(`/api/trips/${tripId}/days`, "POST", { label: newLabel }, () => {
                  setNewDay(false);
                  setNewLabel("");
                  focusHeading();
                });
              }}
            >
              <label className="field-label flex-1">
                New day label (optional)
                <input
                  className="field"
                  autoFocus
                  maxLength={80}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </label>
              <button className="button" disabled={disabled}>
                Add day
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setNewDay(false);
                  focusHeading();
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button className="button-secondary" onClick={() => setNewDay(true)}>
              Add another day
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
