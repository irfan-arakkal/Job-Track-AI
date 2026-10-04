import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { analysisRequestSchema } from "@/features/analysis/schemas";
import { toAiError } from "@/server/ai/client";
import { RateLimitError } from "@/server/errors";

describe("toAiError", () => {
  it.each([
    ["rate limit", new Anthropic.RateLimitError(429, undefined, "rate", new Headers()), 429],
    ["timeout", new Anthropic.APIConnectionTimeoutError(), 504],
    [
      "bad credentials",
      new Anthropic.AuthenticationError(401, undefined, "auth", new Headers()),
      503,
    ],
    [
      "overloaded",
      new Anthropic.InternalServerError(529, undefined, "overloaded", new Headers()),
      503,
    ],
    ["server error", new Anthropic.InternalServerError(500, undefined, "oops", new Headers()), 503],
    ["bad request", new Anthropic.BadRequestError(400, undefined, "bad", new Headers()), 502],
    ["network", new Anthropic.APIConnectionError({ message: "down" }), 503],
    ["unknown", new Error("boom"), 502],
  ])("maps %s to HTTP %i with a safe message", (_name, error, status) => {
    const mapped = toAiError(error);
    expect(mapped.status).toBe(status);
    expect(mapped.message).not.toMatch(/boom|oops|bad$|auth$/);
  });

  it("uses our RateLimitError for 429s", () => {
    expect(
      toAiError(new Anthropic.RateLimitError(429, undefined, "r", new Headers())),
    ).toBeInstanceOf(RateLimitError);
  });
});

describe("analysisRequestSchema", () => {
  it("requires a job description or an application", () => {
    expect(analysisRequestSchema.safeParse({}).success).toBe(false);
    expect(analysisRequestSchema.safeParse({ applicationId: "app_1" }).success).toBe(true);
    expect(analysisRequestSchema.safeParse({ jobDescription: "too short" }).success).toBe(false);
    expect(
      analysisRequestSchema.safeParse({ jobDescription: "x".repeat(150), resumeId: "" }).data
        ?.resumeId,
    ).toBeUndefined();
  });
});
