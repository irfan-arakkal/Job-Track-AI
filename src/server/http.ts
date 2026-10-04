import "server-only";

import { z } from "zod";

import type { SessionUser } from "@/server/auth";
import { AppError, RateLimitError } from "@/server/errors";
import { logger } from "@/server/logger";
import { getCurrentUser } from "@/server/session";

/**
 * Helpers for our REST API route handlers (see docs/04-api.md).
 * Messages are safe to show to users; internal details are only ever logged.
 */
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
) {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers },
  );
}

export const unauthenticated = () =>
  apiError(401, "UNAUTHENTICATED", "You need to be signed in to do that.");

/** Converts any thrown value into a safe JSON error response. */
export function toErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return apiError(422, "VALIDATION_ERROR", "Some fields are invalid.", z.flattenError(error));
  }
  if (error instanceof RateLimitError) {
    return apiError(429, "RATE_LIMITED", error.message, undefined, {
      "Retry-After": String(error.retryAfterSeconds),
    });
  }
  if (error instanceof AppError) {
    return apiError(error.status, error.code, error.message, error.details);
  }
  logger.error("Unhandled API error", { error });
  return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/** Reads a JSON body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("Request body must be valid JSON.", "VALIDATION_ERROR", 400);
  }
}

type AuthedHandler<C> = (args: {
  request: Request;
  user: SessionUser;
  context: C;
}) => Promise<Response>;

/**
 * Wraps a route handler with the two things every protected API route needs:
 *  1. authentication — 401 unless there is a valid session;
 *  2. error handling — known errors become proper status codes, unknown ones a generic 500.
 */
export function withAuth<C = unknown>(handler: AuthedHandler<C>) {
  return async (request: Request, context: C) => {
    const user = await getCurrentUser();
    if (!user) return unauthenticated();
    try {
      return await handler({ request, user, context });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
