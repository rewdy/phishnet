const FALLBACK_TIMEZONE = "America/Chicago";

/**
 * Time zone used to display dashboard timestamps.
 */
export const TIMEZONE = import.meta.env.VITE_TIMEZONE ?? FALLBACK_TIMEZONE;

/**
 * Parses a timestamp coming from the API into a `Date`.
 * Supports ISO timestamps and SQLite-style UTC strings.
 */
export function parseTimestamp(value: string): Date {
  if (value.includes("T") || value.endsWith("Z")) {
    return new Date(value);
  }

  return new Date(`${value.replace(" ", "T")}Z`);
}

/**
 * Formats an API timestamp for dashboard display in the configured timezone.
 */
export function formatTimestamp(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = parseTimestamp(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}
