"use client";
import { useState } from "react";
import { getAuthJsonHeaders } from "@/lib/client-api";
import { useTripMutation } from "@/lib/components/use-trip-mutation";
import { TimezoneField, suggestedTimezone } from "@/lib/components/timezone-field";
import type { calendarReadiness } from "@/lib/calendar/readiness";
type Props = {
  tripId: string;
  readiness: ReturnType<typeof calendarReadiness>;
  timezone: string | null;
  startDate: string | null;
  destination: string;
  canEdit: boolean;
  scaffold?: boolean;
};
export function CalendarExport({
  tripId,
  readiness,
  timezone,
  startDate,
  destination,
  canEdit,
  scaffold = false,
}: Props) {
  const [date, setDate] = useState(startDate ?? "");
  const [zone, setZone] = useState(timezone ?? suggestedTimezone(destination) ?? "");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const { mutate, saving, error, status } = useTripMutation();
  async function download() {
    if (downloading || scaffold) return;
    setDownloading(true);
    setDownloadError(null);
    setDownloaded(false);
    try {
      const response = await fetch(`/api/trips/${tripId}/calendar`, { headers: await getAuthJsonHeaders() });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Could not prepare your calendar.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "trip-calendar.ics";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Could not download. Please retry.");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <section id="calendar" aria-labelledby="calendar-heading" className="panel">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="max-w-xl">
          <p className="eyebrow">Your calendar</p>
          <h2 id="calendar-heading" className="mt-2 section-heading">
            {readiness.ready ? "Ready to take with you" : "Give the plan a date"}
          </h2>
          <p className="mt-2 text-sm muted">
            {readiness.ready
              ? `${readiness.eventCount} events · ${timezone?.replaceAll("_", " ")}`
              : "Start with ideas. Add dates and a timezone when the group is ready."}
          </p>
          {!readiness.ready ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {readiness.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="sm:max-w-64">
          <button
            type="button"
            className="button w-full"
            onClick={download}
            disabled={!readiness.ready || scaffold || downloading}
          >
            {downloading ? "Preparing calendar…" : "Download calendar snapshot"}
          </button>
          <p className="mt-2 text-xs leading-relaxed muted">
            One-time .ics file. It won’t update when this plan changes.
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed muted">
        Includes event titles, dates, times and locations. Notes, booking links, confirmation codes and ticket
        references stay in TravelTogether. Untimed events appear as all-day; an end time before the start
        means the next day.
      </p>
      {scaffold ? (
        <p className="mt-3 text-sm muted">Sample trip · Downloads and saving are disabled in this preview.</p>
      ) : null}
      {!canEdit && !readiness.ready ? (
        <p className="mt-3 text-sm">Ask an owner or editor to complete the calendar details.</p>
      ) : null}
      {canEdit ? (
        <details className="mt-4 border-t border-[var(--line)] pt-4">
          <summary className="text-sm font-semibold">
            {startDate ? "Change dates & timezone" : "Set dates & timezone"}
          </summary>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(`/api/trips/${tripId}/schedule`, "PATCH", { startDate: date, timezone: zone });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                First day
                <input
                  className="field"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <TimezoneField value={zone} onChange={setZone} required />
            </div>
            <p className="text-sm muted">
              Assigns consecutive dates to every day in the itinerary, replacing any existing day dates. Event
              times stay the same in the selected timezone.
            </p>
            <button className="button-secondary" disabled={saving || scaffold}>
              {saving ? "Saving…" : "Save dates & timezone"}
            </button>
            <p role="status" className="status">
              {status}
            </p>
            {error ? (
              <p role="alert" className="error">
                {error}
              </p>
            ) : null}
          </form>
        </details>
      ) : null}
      {downloadError ? (
        <p role="alert" className="error mt-3">
          {downloadError}
        </p>
      ) : null}
      {downloaded ? (
        <p role="status" className="mt-3 status">
          Snapshot downloaded. Import it into your calendar. Repeated imports may create duplicates in some
          calendar apps.
        </p>
      ) : null}
    </section>
  );
}
