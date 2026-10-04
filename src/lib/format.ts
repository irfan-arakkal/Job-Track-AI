/**
 * Formatting helpers shared by server and client.
 *
 * Date-only values (applied date, follow-up date) are stored as midnight UTC, so they are
 * formatted in UTC — otherwise "3 March" could display as "2 March" west of Greenwich.
 * Date-times (interviews) are formatted in the user's own time zone.
 */
export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

export function formatDateTime(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatRelativeDays(value: Date | string, now = new Date()) {
  const days = Math.round((new Date(value).getTime() - now.getTime()) / 86_400_000);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day");
}

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
) {
  if (min == null && max == null) return "—";
  const format = (amount: number) =>
    new Intl.NumberFormat("en", {
      style: currency ? "currency" : "decimal",
      currency: currency ?? undefined,
      maximumFractionDigits: 0,
      notation: amount >= 1_000_000 ? "compact" : "standard",
    }).format(amount);
  if (min != null && max != null)
    return min === max ? format(min) : `${format(min)} – ${format(max)}`;
  return min != null ? `From ${format(min)}` : `Up to ${format(max!)}`;
}

/** "2026-03-04" for a Date stored as midnight UTC — the value an <input type="date"> expects. */
export function toDateInputValue(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}
