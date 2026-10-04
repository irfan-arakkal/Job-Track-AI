/**
 * Time-zone helpers built on the browser/Node `Intl` API (no extra library).
 *
 * Interviews are stored as UTC instants. A user types a *wall-clock* time ("10:00 on 5 March")
 * that means 10:00 in THEIR time zone, so we convert between the two using their saved zone.
 */

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * IANA zones for the settings picker. The runtime's list uses some older canonical names
 * (e.g. "Asia/Calcutta" rather than "Asia/Kolkata") and omits "UTC", so we always add UTC and
 * any extra zones passed in (such as the user's current one) to guarantee they can be selected.
 */
/** Zones the runtime may list under a legacy name, mapped to the name people expect. */
const MODERN_ZONE_NAMES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Europe/Kiev": "Europe/Kyiv",
  "Atlantic/Faeroe": "Atlantic/Faroe",
};

export function listTimeZones(...include: string[]): string[] {
  const zones = new Set(
    (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []).map(
      (zone) => (isValidTimeZone(MODERN_ZONE_NAMES[zone] ?? "") ? MODERN_ZONE_NAMES[zone] : zone),
    ),
  );
  for (const zone of ["UTC", ...include]) if (isValidTimeZone(zone)) zones.add(zone);
  return [...zones].sort();
}

/** The wall-clock parts of an instant in a zone. */
function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** How far the zone is ahead of UTC at that instant, in milliseconds (handles DST). */
function offsetMs(date: Date, timeZone: string) {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * "2026-03-05T10:00" interpreted in `timeZone` → the matching UTC Date.
 *
 * Daylight-saving changes make this tricky, so we try the zone's offset from a day before and
 * a day after, and keep the candidates that really show that wall-clock time:
 *  - normally both agree;
 *  - when clocks go back, 02:30 happens twice → we pick the EARLIER one;
 *  - when clocks go forward, 02:30 doesn't exist → we shift it forward by the gap.
 * (The same "compatible" rule JavaScript's new Temporal API uses.)
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) throw new Error(`Invalid local date-time: ${local}`);
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  const DAY = 86_400_000;
  const offsetBefore = offsetMs(new Date(wallAsUtc - DAY), timeZone);
  const offsetAfter = offsetMs(new Date(wallAsUtc + DAY), timeZone);

  const candidates = [wallAsUtc - offsetBefore, wallAsUtc - offsetAfter].filter(
    (t) => utcToZonedLocal(new Date(t), timeZone) === local.slice(0, 16),
  );
  if (candidates.length > 0) return new Date(Math.min(...candidates));
  // Gap (spring forward): the wall time is skipped, so move it forward by the gap.
  return new Date(wallAsUtc - offsetBefore);
}

/** A UTC Date → "2026-03-05T10:00" in `timeZone`: the value a datetime-local input expects. */
export function utcToZonedLocal(date: Date, timeZone: string): string {
  const p = partsInZone(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Accepts either a wall-clock value from a form ("2026-03-05T10:00", interpreted in the user's
 * zone) or a full ISO timestamp with an offset from the API ("2026-03-05T09:00:00Z").
 */
export function parseDateTimeInput(value: string, timeZone: string): Date {
  return /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? new Date(value) : zonedLocalToUtc(value, timeZone);
}
