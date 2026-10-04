import "server-only";

import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";

/**
 * Runs the body of a Server Action and converts failures into an ActionResult, mirroring what
 * `toErrorResponse` does for API routes. Redirects thrown by Next.js are re-thrown untouched.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        message: "Please fix the highlighted fields.",
        fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
      };
    }
    if (error instanceof AppError) {
      return { ok: false, message: error.message };
    }
    // Next.js implements redirect()/notFound() by throwing special errors — let them through.
    if (error instanceof Error && "digest" in error && String(error.digest).startsWith("NEXT_")) {
      throw error;
    }
    logger.error("Unhandled Server Action error", { error });
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
