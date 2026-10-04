import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/env";
import { AppError, RateLimitError } from "@/server/errors";
import { logger } from "@/server/logger";

/*
 * The single place that creates the Claude API client and translates its errors.
 * Feature code never sees SDK error classes — only our AppErrors with safe messages.
 */

export class AiNotConfiguredError extends AppError {
  constructor() {
    super(
      "AI features aren't set up on this server yet (ANTHROPIC_API_KEY is missing).",
      "SERVICE_UNAVAILABLE",
      503,
    );
  }
}

export function isAiConfigured() {
  return Boolean(env.ANTHROPIC_API_KEY);
}

let client: Anthropic | undefined;

export function getAnthropicClient() {
  if (!env.ANTHROPIC_API_KEY) throw new AiNotConfiguredError();
  client ??= new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    // Fail fast instead of keeping a user waiting for minutes; the SDK retries 429/5xx and
    // connection errors twice with backoff before giving up.
    timeout: 90_000,
    maxRetries: 2,
  });
  return client;
}

export const aiModel = () => env.ANTHROPIC_MODEL;

/** Maps Claude API failures to user-safe AppErrors (most specific first). Logs the details. */
export function toAiError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AppError(
      "The AI took too long to respond. Please try again.",
      "UPSTREAM_ERROR",
      504,
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new RateLimitError("The AI service is busy right now. Please try again in a minute.");
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    logger.error("Claude API rejected our credentials", { status: error.status });
    return new AppError("The AI service isn't configured correctly.", "SERVICE_UNAVAILABLE", 503);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    logger.warn("Could not reach the Claude API", { error });
    return new AppError(
      "Couldn't reach the AI service. Please try again.",
      "SERVICE_UNAVAILABLE",
      503,
    );
  }
  if (error instanceof Anthropic.APIError) {
    // 5xx and 529 "overloaded" are temporary; anything else (400…) is a bug on our side.
    const temporary = (error.status ?? 500) >= 500;
    logger.error("Claude API error", { status: error.status, message: error.message });
    return temporary
      ? new AppError(
          "The AI service is temporarily unavailable. Please try again.",
          "SERVICE_UNAVAILABLE",
          503,
        )
      : new AppError("The AI request failed. Please try again.", "UPSTREAM_ERROR", 502);
  }
  logger.error("Unexpected AI error", { error });
  return new AppError("The AI request failed. Please try again.", "UPSTREAM_ERROR", 502);
}
