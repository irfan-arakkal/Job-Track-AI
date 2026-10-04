import { describe, expect, it } from "vitest";

import { formatDate, formatRelativeDays, formatSalary } from "@/lib/format";

describe("format helpers", () => {
  const now = new Date("2026-05-20T12:00:00Z");
  it.each([
    ["2026-05-21T12:00:00Z", "tomorrow"],
    ["2026-05-17T12:00:00Z", "3 days ago"],
    ["2026-07-20T12:00:00Z", "in 2 months"],
    ["2029-05-20T12:00:00Z", "in 3 years"],
  ])("formatRelativeDays(%s) = %s", (value, expected) => {
    expect(formatRelativeDays(value, now)).toBe(expected);
  });

  it("formats date-only values in UTC so the day never shifts", () => {
    expect(formatDate("2026-03-04T00:00:00.000Z")).toBe("Mar 4, 2026");
    expect(formatDate(null)).toBe("—");
  });

  it("formats salary ranges", () => {
    expect(formatSalary(60000, 80000, "EUR")).toBe("€60,000 – €80,000");
    expect(formatSalary(50000, null, "USD")).toBe("From $50,000");
    expect(formatSalary(null, null, null)).toBe("—");
  });
});
