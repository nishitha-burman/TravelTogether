type CalendarExportProps = {
  tripId: string;
  eventCount: number;
  hasUndatedEvents: boolean;
  scaffold?: boolean;
};

export function CalendarExport({
  tripId,
  eventCount,
  hasUndatedEvents,
  scaffold = false
}: CalendarExportProps) {
  const unavailable = scaffold || eventCount === 0 || hasUndatedEvents;

  let status = `${eventCount} timeline ${eventCount === 1 ? "event" : "events"} ready to export.`;
  if (scaffold) status = "Calendar downloads activate after Supabase setup.";
  else if (eventCount === 0) status = "Add a timeline event to enable calendar export.";
  else if (hasUndatedEvents) status = "Calendar export currently requires a trip created with a date range.";

  return (
    <section className="rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Calendar export</h2>
          <p className="mt-1 text-sm text-slate-700">{status}</p>
          {!unavailable ? (
            <p className="mt-1 text-xs text-slate-500">
              Times are exported as local trip times. Private confirmation codes and ticket references are excluded.
            </p>
          ) : null}
        </div>

        {unavailable ? (
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center justify-center rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Download .ics
          </span>
        ) : (
          <a
            href={`/api/trips/${tripId}/calendar`}
            download
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Download .ics
          </a>
        )}
      </div>
    </section>
  );
}
