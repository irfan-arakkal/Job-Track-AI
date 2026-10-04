import { describe, expect, it } from "vitest";

import { registerSchema } from "@/features/auth/schemas";

const valid = {
  name: "Ada Lovelace",
  email: "Ada@Example.com ",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

describe("registerSchema", () => {
  it("accepts valid input and normalises the email", () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe("ada@example.com");
  });

  it("rejects a blank name", () => {
    expect(registerSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("reports mismatched passwords on the confirm field", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
