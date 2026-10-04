import { describe, expect, it } from "vitest";

import {
  isValidTimeZone,
  parseDateTimeInput,
  utcToZonedLocal,
  zonedLocalToUtc,
} from "@/lib/timezone";

describe("time zone conversion", () => {
  it("converts wall-clock time in a zone to UTC", () => {
    // India is UTC+5:30 all year.
    expect(zonedLocalToUtc("2026-03-05T10:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-03-05T04:30:00.000Z",
    );
    expect(zonedLocalToUtc("2026-03-05T10:00", "UTC").toISOString()).toBe(
      "2026-03-05T10:00:00.000Z",
    );
  });

  it("handles daylight saving time", () => {
    // London: GMT (UTC+0) in January, BST (UTC+1) in July.
    expect(zonedLocalToUtc("2026-01-15T09:00", "Europe/London").toISOString()).toBe(
      "2026-01-15T09:00:00.000Z",
    );
    expect(zonedLocalToUtc("2026-07-15T09:00", "Europe/London").toISOString()).toBe(
      "2026-07-15T08:00:00.000Z",
    );
    // New York: UTC-5 in winter, UTC-4 in summer.
    expect(zonedLocalToUtc("2026-07-15T09:00", "America/New_York").toISOString()).toBe(
      "2026-07-15T13:00:00.000Z",
    );
  });

  it("round-trips UTC → local → UTC", () => {
    const instant = new Date("2026-10-25T00:30:00Z");
    for (const zone of ["Asia/Kolkata", "Europe/Berlin", "America/Los_Angeles", "Asia/Dubai"]) {
      expect(zonedLocalToUtc(utcToZonedLocal(instant, zone), zone).toISOString()).toBe(
        instant.toISOString(),
      );
    }
  });

  it("accepts ISO timestamps with an offset as-is", () => {
    expect(parseDateTimeInput("2026-03-05T09:00:00Z", "Asia/Kolkata").toISOString()).toBe(
      "2026-03-05T09:00:00.000Z",
    );
    expect(parseDateTimeInput("2026-03-05T10:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-03-05T04:30:00.000Z",
    );
  });

  it("validates zone names", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("daylight-saving edge cases", () => {
  it("picks the earlier instant when a wall time happens twice (clocks go back)", () => {
    // Berlin, 25 Oct 2026: 03:00 CEST → 02:00 CET, so 02:30 occurs at 00:30Z and 01:30Z.
    expect(zonedLocalToUtc("2026-10-25T02:30", "Europe/Berlin").toISOString()).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });

  it("shifts a skipped wall time forward (clocks go forward)", () => {
    // Berlin, 29 Mar 2026: 02:00 CET → 03:00 CEST, so 02:30 doesn't exist → 03:30 CEST (01:30Z).
    expect(zonedLocalToUtc("2026-03-29T02:30", "Europe/Berlin").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });
});

describe("listTimeZones", () => {
  it("always includes UTC and requested zones, sorted", async () => {
    const { listTimeZones } = await import("@/lib/timezone");
    const zones = listTimeZones("Asia/Kolkata");
    expect(zones).toContain("UTC");
    expect(zones).toContain("Asia/Kolkata");
    expect(zones).toEqual([...zones].sort());
    expect(listTimeZones("Not/AZone")).not.toContain("Not/AZone");
    // Modern names are offered even when the runtime only knows the legacy one.
    expect(listTimeZones()).toContain("Asia/Kolkata");
    expect(listTimeZones()).not.toContain("Asia/Calcutta");
  });
});
