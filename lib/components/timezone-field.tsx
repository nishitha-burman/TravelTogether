"use client";
export function suggestedTimezone(city: string) {
  const suggestions: Record<string, string> = {
    honolulu: "Pacific/Honolulu",
    lisbon: "Europe/Lisbon",
    porto: "Europe/Lisbon",
    kyoto: "Asia/Tokyo",
    tokyo: "Asia/Tokyo",
    london: "Europe/London",
    paris: "Europe/Paris",
    barcelona: "Europe/Madrid",
    rome: "Europe/Rome",
    "new york": "America/New_York",
    "los angeles": "America/Los_Angeles",
    sydney: "Australia/Sydney",
  };
  return suggestions[city.trim().toLowerCase().split(",")[0]] ?? null;
}
export function TimezoneField({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const zones = Array.from(
    new Set(["UTC", value, ...Intl.supportedValuesOf("timeZone")]),
  )
    .filter(Boolean)
    .sort();
  return (
    <label className="field-label">
      Trip timezone
      <select
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Choose a timezone</option>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs font-normal muted">
        All event times use this timezone, including overnight travel.
      </span>
    </label>
  );
}
