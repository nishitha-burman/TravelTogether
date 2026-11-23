"use client";

import { useId, useRef, useState } from "react";
import type { DayRow, EventRow, TripRow } from "@/types/trip";
import { useTripMutation } from "@/lib/components/use-trip-mutation";
import { TimezoneField } from "@/lib/components/timezone-field";
import { DeleteItineraryButton } from "@/lib/components/delete-itinerary-button";

export function TripSettings({
  trip,
  days,
  events,
  initiallyOpen = false,
  scaffold = false,
}: {
  trip: TripRow;
  days: DayRow[];
  events: EventRow[];
  initiallyOpen?: boolean;
  scaffold?: boolean;
}) {
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(initiallyOpen);
  const [title, setTitle] = useState(trip.title);
  const [mode, setMode] = useState(trip.planning_mode);
  const [length, setLength] = useState(days.length || 1);
  const [start, setStart] = useState(trip.start_date ?? "");
  const [end, setEnd] = useState(trip.end_date ?? "");
  const [zone, setZone] = useState(trip.timezone ?? "");
  const { mutate, saving, error, status } = useTripMutation();
  const count =
    mode === "days"
      ? length
      : Math.floor(
          (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
            86_400_000,
        ) + 1;
  const scheduleChanged =
    mode !== trip.planning_mode ||
    zone !== (trip.timezone ?? "") ||
    (mode === "days"
      ? length !== days.length
      : start !== (trip.start_date ?? "") || end !== (trip.end_date ?? ""));
  const removedDays = new Set(
    [...days]
      .sort((a, b) => a.day_number - b.day_number)
      .slice(Math.max(count, 0))
      .map((day) => day.id),
  );
  const protectedEvents =
    scheduleChanged && count < days.length
      ? events.filter((event) => removedDays.has(event.day_id)).length
      : 0;

  function close() {
    setOpen(false);
    requestAnimationFrame(() => toggle.current?.focus());
  }

  return (
    <section aria-label="Trip details" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          ref={toggle}
          className="button-secondary"
          aria-expanded={open}
          aria-controls={panelId}
          disabled={saving}
          onClick={() => {
            if (open) close();
            else {
              setTitle(trip.title);
              setMode(trip.planning_mode);
              setLength(days.length || 1);
              setStart(trip.start_date ?? "");
              setEnd(trip.end_date ?? "");
              setZone(trip.timezone ?? "");
              setOpen(true);
            }
          }}
        >
          Edit trip
        </button>
        <DeleteItineraryButton
          tripId={trip.id}
          tripTitle={trip.title}
          scaffold={scaffold}
          redirectToDashboard
        />
      </div>
      <p role="status" className="status">
        {status}
      </p>
      {open ? (
        <form
          id={panelId}
          className="panel space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (scaffold || saving || protectedEvents) return;
            void mutate(
              `/api/trips/${trip.id}`,
              "PATCH",
              {
                title,
                ...(scheduleChanged
                  ? {
                      planningMode: mode,
                      timezone: zone || null,
                      ...(mode === "days"
                        ? { tripLengthDays: length }
                        : { startDate: start, endDate: end }),
                    }
                  : {}),
              },
              close,
            );
          }}
        >
          <h2 className="section-heading">Edit trip details</h2>
          <fieldset className="space-y-5" disabled={saving}>
            <label className="field-label">
              Trip title
              <input
                className="field"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={120}
                autoFocus
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-semibold">Trip dates</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={panelId}
                  checked={mode === "days"}
                  onChange={() => setMode("days")}
                />
                Number of days · dates open
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={panelId}
                  checked={mode === "date_range"}
                  onChange={() => setMode("date_range")}
                />
                Actual dates
              </label>
            </fieldset>
            {mode === "days" ? (
              <label className="field-label">
                Number of days
                <input
                  className="field max-w-48"
                  type="number"
                  min={1}
                  max={120}
                  required
                  value={Number.isFinite(length) ? length : ""}
                  onChange={(event) => setLength(event.target.valueAsNumber)}
                />
              </label>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Start date
                  <input
                    className="field"
                    type="date"
                    required
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  End date
                  <input
                    className="field"
                    type="date"
                    required
                    min={start || undefined}
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </label>
              </div>
            )}
            {Number.isFinite(count) && count > 0 ? (
              <p className="text-sm muted">
                {count} {count === 1 ? "day" : "days"} · up to 120 days
              </p>
            ) : null}
            <TimezoneField value={zone} onChange={setZone} />
            <p className="text-sm muted">
              Changing the schedule assigns consecutive dates or clears dates
              when you choose a number of days. Event times stay in the trip’s
              timezone. Shortening removes only empty days at the end.
            </p>
            {protectedEvents ? (
              <p className="error" role="alert">
                {protectedEvents}{" "}
                {protectedEvents === 1 ? "event is" : "events are"} on days
                being removed. Clear those events in Itinerary before shortening
                this trip.
              </p>
            ) : null}
            {scaffold ? (
              <p className="status">
                Sample trip · Saving and deletion are disabled.
              </p>
            ) : null}
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                className="button"
                disabled={
                  scaffold ||
                  saving ||
                  Boolean(protectedEvents) ||
                  !Number.isFinite(count) ||
                  count < 1 ||
                  count > 120
                }
              >
                {saving ? "Saving…" : "Save trip"}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={close}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      ) : null}
    </section>
  );
}
