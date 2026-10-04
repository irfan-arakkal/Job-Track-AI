import "server-only";

/**
 * Consistent JSON error responses for our REST API (see docs/04-api.md).
 * Messages here are safe to show to users; internal details are only ever logged.
 */
export type ApiErrorCode =
  "UNAUTHENTICATED" | "NOT_FOUND" | "VALIDATION_ERROR" | "RATE_LIMITED" | "INTERNAL_ERROR";

export function apiError(status: number, code: ApiErrorCode, message: string, details?: unknown) {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export const unauthenticated = () =>
  apiError(401, "UNAUTHENTICATED", "You need to be signed in to do that.");
