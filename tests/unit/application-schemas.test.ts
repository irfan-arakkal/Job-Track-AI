import { describe, expect, it } from "vitest";

import {
  applicationInputSchema,
  applicationListQuerySchema,
  applicationPatchSchema,
} from "@/features/applications/schemas";

const base = { companyName: " Acme ", jobTitle: "Engineer" };

describe("applicationInputSchema", () => {
  it("trims text and turns empty form values into null", () => {
    const result = applicationInputSchema.parse({
      ...base,
      jobUrl: "",
      location: "  ",
      workMode: "",
      salaryMin: "",
      appliedAt: "",
    });
    expect(result).toMatchObject({
      companyName: "Acme",
      jobUrl: null,
      location: null,
      workMode: null,
      salaryMin: null,
      appliedAt: null,
      status: "APPLIED",
    });
  });

  it("parses money written with commas and stores dates as midnight UTC", () => {
    const result = applicationInputSchema.parse({
      ...base,
      salaryMin: "85,000",
      salaryCurrency: "eur",
      appliedAt: "2026-03-04",
    });
    expect(result.salaryMin).toBe(85000);
    expect(result.salaryCurrency).toBe("EUR");
    expect(result.appliedAt?.toISOString()).toBe("2026-03-04T00:00:00.000Z");
  });

  it.each([
    [{ companyName: "" }, "companyName"],
    [{ jobTitle: "   " }, "jobTitle"],
    [{ jobUrl: "javascript:alert(1)" }, "jobUrl"],
    [{ jobUrl: "not a url" }, "jobUrl"],
    [{ salaryMin: "-5", salaryCurrency: "USD" }, "salaryMin"],
    [{ salaryMin: "12.5", salaryCurrency: "USD" }, "salaryMin"],
    [{ salaryMin: "100", salaryMax: "50", salaryCurrency: "USD" }, "salaryMax"],
    [{ salaryMin: "100" }, "salaryCurrency"],
    [{ status: "HIRED" }, "status"],
    [{ appliedAt: "yesterday" }, "appliedAt"],
  ])("rejects %j (error on %s)", (overrides, field) => {
    const result = applicationInputSchema.safeParse({ ...base, ...overrides });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});

describe("applicationPatchSchema", () => {
  it("allows partial updates and rejects unknown fields", () => {
    expect(applicationPatchSchema.parse({ jobTitle: "New" })).toEqual({ jobTitle: "New" });
    expect(applicationPatchSchema.safeParse({ userId: "someone-else" }).success).toBe(false);
  });
});

describe("applicationListQuerySchema", () => {
  it("falls back to safe defaults for bad query params", () => {
    expect(
      applicationListQuerySchema.parse({ status: "NOPE", page: "-3", sort: "drop table" }),
    ).toEqual({
      q: undefined,
      status: undefined,
      sort: "updated",
      page: 1,
      pageSize: 20,
    });
  });
});
