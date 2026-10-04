import { describe, expect, it } from "vitest";

import { isProtectedPath } from "@/lib/routes";

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/applications", "/applications/abc123", "/settings"])(
    "protects %s",
    (path) => expect(isProtectedPath(path)).toBe(true),
  );

  it.each(["/", "/login", "/register", "/dashboards", "/applicationsx"])(
    "leaves %s public",
    (path) => expect(isProtectedPath(path)).toBe(false),
  );
});
