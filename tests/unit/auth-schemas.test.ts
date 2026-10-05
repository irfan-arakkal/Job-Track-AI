import { describe, expect, it } from "vitest";

import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from "@/features/auth/schemas";

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

describe("forgotPasswordSchema", () => {
  it("normalises the email", () => {
    expect(forgotPasswordSchema.parse({ email: " Ada@Example.com" }).email).toBe("ada@example.com");
  });

  it("rejects an invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    const values = { password: "correct-horse", confirmPassword: "correct-horse" };
    expect(resetPasswordSchema.safeParse(values).success).toBe(true);
  });

  it("rejects a short password", () => {
    const values = { password: "short", confirmPassword: "short" };
    expect(resetPasswordSchema.safeParse(values).success).toBe(false);
  });

  it("reports mismatched passwords on the confirm field", () => {
    const result = resetPasswordSchema.safeParse({
      password: "correct-horse",
      confirmPassword: "different",
    });
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
