import "server-only";

/**
 * Errors the service layer throws on purpose. Each carries a message that is safe to show to
 * users. Anything else that is thrown is unexpected: it gets logged and replaced by a generic
 * message, so internals (SQL, stack traces) never reach the browser.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "RATE_LIMITED" | "FORBIDDEN",
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found.`, "NOT_FOUND", 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 422, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = "Too many requests. Please wait a moment and try again.",
    readonly retryAfterSeconds = 60,
  ) {
    super(message, "RATE_LIMITED", 429);
  }
}
