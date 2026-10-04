import { describe, expect, it } from "vitest";

import { getSafeRedirect } from "@/lib/safe-redirect";

describe("getSafeRedirect", () => {
  it("allows paths on our own site", () => {
    expect(getSafeRedirect("/settings")).toBe("/settings");
    expect(getSafeRedirect("/applications/123?tab=notes")).toBe("/applications/123?tab=notes");
  });

  it("falls back to the dashboard when no value is given", () => {
    expect(getSafeRedirect(undefined)).toBe("/dashboard");
    expect(getSafeRedirect(null)).toBe("/dashboard");
    expect(getSafeRedirect("")).toBe("/dashboard");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example/path",
  ])("rejects external or unsafe target %s", (value) => {
    expect(getSafeRedirect(value)).toBe("/dashboard");
  });

  it("uses a custom fallback", () => {
    expect(getSafeRedirect("//evil.example", "/")).toBe("/");
  });
});
