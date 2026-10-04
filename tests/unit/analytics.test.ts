import { describe, expect, it } from "vitest";

import { average, median, monthSeries, responseDays, topWithOther } from "@/lib/analytics";

const d = (iso: string) => new Date(iso);

describe("analytics helpers", () => {
  it("builds a continuous month series, including empty months and year boundaries", () => {
    expect(monthSeries(d("2025-11-15T00:00:00Z"), d("2026-02-03T00:00:00Z"))).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("measures days to the first real response, ignoring non-responses", () => {
    const applied = d("2026-05-01T00:00:00Z");
    expect(
      responseDays(applied, [
        { toStatus: "APPLIED", changedAt: d("2026-05-01T00:00:00Z") },
        { toStatus: "INTERVIEW", changedAt: d("2026-05-15T00:00:00Z") },
        { toStatus: "SCREENING", changedAt: d("2026-05-06T00:00:00Z") },
      ]),
    ).toBe(5);
    expect(responseDays(applied, [{ toStatus: "APPLIED", changedAt: applied }])).toBeNull();
    expect(responseDays(null, [])).toBeNull();
  });

  it("averages and medians, with null for no data", () => {
    expect(average([2, 4, 9])).toBe(5);
    expect(median([9, 2, 4])).toBe(4);
    expect(median([1, 2, 3, 10])).toBe(2.5);
    expect(average([])).toBeNull();
    expect(median([])).toBeNull();
  });

  it("keeps the top groups and folds the rest into Other", () => {
    const counts = new Map([
      ["A", 5],
      ["B", 3],
      ["C", 1],
      ["D", 1],
    ]);
    expect(topWithOther(counts, 2)).toEqual([
      { name: "A", count: 5 },
      { name: "B", count: 3 },
      { name: "Other", count: 2 },
    ]);
    expect(topWithOther(new Map([["A", 1]]), 2)).toEqual([{ name: "A", count: 1 }]);
  });
});
