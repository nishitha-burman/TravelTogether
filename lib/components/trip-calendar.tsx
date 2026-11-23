"use client";

import { useState } from "react";
import {
  calendarEvents,
  calendarPages,
  type CalendarDay,
  type CalendarEvent,
} from "@/lib/calendar/view";
import { dateLabel } from "@/lib/calendar/time";

const colors: Record<CalendarEvent["event_type"], string> = {
  stay: "border-[#c6d6c5] bg-[#edf3e9]",
  food: "border-[#ecd4be] bg-[#fbefe3]",
  travel: "border-[#cadce5] bg-[#edf4f8]",
  activity: "border-[#d8d3e3] bg-[#f1eef6]",
  museum: "border-[#e3d8b5] bg-[#f9f4e4]",
  custom: "border-[var(--line)] bg-[#f5f5f1]",
};

function EventCard({ event }: { event: CalendarEvent }) {
  const overnight =
    event.start_time && event.end_time && event.end_time <= event.start_time;
  return (
    <article
      className={`rounded-md border p-2.5 text-left ${colors[event.event_type]}`}
    >
      <p className="text-[11px] font-semibold capitalize text-[var(--muted)]">
        {event.event_type}
      </p>
      <h4 className="mt-1 break-words text-sm font-semibold leading-snug">
        {event.title}
      </h4>
      {event.start_time ? (
        <p className="mt-2 text-xs tabular-nums">
          <time>{event.start_time.slice(0, 5)}</time>
          {event.end_time ? (
            <>
              {" "}
              – <time>{event.end_time.slice(0, 5)}</time>
              {overnight ? " (+1 day)" : ""}
            </>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

export function TripCalendar({
  days,
  events,
  timezone,
}: {
  days: CalendarDay[];
  events: CalendarEvent[];
  timezone: string | null;
}) {
  const pages = calendarPages(days);
  const [pageIndex, setPageIndex] = useState(0);
  const index = Math.min(pageIndex, Math.max(pages.length - 1, 0));
  const page = pages[index];
  const title = page?.dated
    ? `${dateLabel(page.cells[0].date)} – ${dateLabel(page.cells[6].date)}`
    : page
      ? `Days ${page.cells[0].days[0].day_number}–${page.cells[page.cells.length - 1].days[0].day_number}`
      : "Your calendar";

  return (
    <section
      aria-labelledby="trip-calendar-heading"
      className="min-w-0 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">The week at a glance</p>
          <h2 id="trip-calendar-heading" className="section-heading mt-2">
            Your trip calendar
          </h2>
          <p className="mt-2 text-sm muted">
            {timezone
              ? `Local times in ${timezone.replaceAll("_", " ")}`
              : "Timezone not set"}{" "}
            · Untimed events appear under All day.
          </p>
        </div>
        {pages.length > 1 ? (
          <div className="flex gap-2">
            <button
              className="button-secondary"
              aria-label="Previous calendar week"
              disabled={index === 0}
              onClick={() => setPageIndex(index - 1)}
            >
              ←
            </button>
            <button
              className="button-secondary"
              aria-label="Next calendar week"
              disabled={index === pages.length - 1}
              onClick={() => setPageIndex(index + 1)}
            >
              →
            </button>
          </div>
        ) : null}
      </div>
      <p aria-live="polite" aria-atomic="true" className="font-serif text-xl">
        {title}
      </p>
      {page && !page.dated ? (
        <p className="status">
          Dates are still open. These are your itinerary days; set dates below
          to place them on the calendar.
        </p>
      ) : null}
      {!page ? (
        <p className="panel muted">
          Add a day to the itinerary to start your calendar.
        </p>
      ) : (
        <>
          <p className="text-xs muted sm:hidden">
            Swipe across to see every day.
          </p>
          <div
            className="overflow-x-auto rounded-lg border border-[var(--line)] bg-white"
            role="region"
            aria-label="Weekly event calendar"
            tabIndex={0}
          >
            <div
              className="grid min-w-[840px] divide-x divide-[var(--line)]"
              style={{
                gridTemplateColumns: `repeat(${page.cells.length}, minmax(0, 1fr))`,
              }}
            >
              {page.cells.map((cell) => {
                const entries = calendarEvents(events, cell.days);
                const allDay = entries.filter((event) => !event.start_time);
                const timed = entries.filter((event) => event.start_time);
                return (
                  <section
                    key={cell.key}
                    aria-label={
                      cell.date
                        ? dateLabel(cell.date)
                        : `Day ${cell.days[0].day_number}`
                    }
                    className={
                      cell.days.length ? "min-w-0" : "min-w-0 bg-[#f5f5f1]"
                    }
                  >
                    <header className="min-h-36 border-b border-[var(--line)] p-3">
                      <p className="eyebrow">
                        {cell.date
                          ? new Intl.DateTimeFormat("en", {
                              weekday: "short",
                              timeZone: "UTC",
                            }).format(new Date(`${cell.date}T12:00:00Z`))
                          : "Day"}
                      </p>
                      <h3 className="mt-2 font-serif text-3xl">
                        {cell.date
                          ? Number(cell.date.slice(-2))
                          : cell.days[0].day_number}
                      </h3>
                      {cell.days.map((day) => (
                        <p
                          key={day.id}
                          className="mt-2 text-xs leading-snug muted"
                        >
                          {cell.date ? `Day ${day.day_number} · ` : ""}
                          {day.label || "An open day"}
                        </p>
                      ))}
                    </header>
                    <div className="space-y-3 p-2">
                      {allDay.length ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide muted">
                            All day
                          </p>
                          {allDay.map((event) => (
                            <EventCard key={event.id} event={event} />
                          ))}
                        </div>
                      ) : null}
                      {timed.length ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide muted">
                            Scheduled
                          </p>
                          {timed.map((event) => (
                            <EventCard key={event.id} event={event} />
                          ))}
                        </div>
                      ) : null}
                      {!entries.length ? (
                        <p className="px-1 py-6 text-xs muted">
                          {cell.days.length
                            ? "Room to explore"
                            : "Outside your trip"}
                        </p>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
