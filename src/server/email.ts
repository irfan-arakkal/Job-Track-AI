import "server-only";

import { env } from "@/env";
import { logger } from "@/server/logger";

type Email = { to: string; subject: string; text: string; html: string };

/** True when outgoing email is set up (a Resend API key and a sender address). */
export function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

/**
 * Whether "Forgot password?" can work here: with email set up, or in development, where the
 * reset link is printed to the server console instead of being emailed.
 */
export function isPasswordResetAvailable() {
  return isEmailConfigured() || env.NODE_ENV !== "production";
}

/**
 * Sends one transactional email through Resend's HTTP API (no SDK needed).
 * Throws on failure so callers can log it; never logs the message body (it may hold a token).
 */
export async function sendEmail({ to, subject, text, html }: Email) {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured (set RESEND_API_KEY and EMAIL_FROM).");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text, html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Resend responded with ${response.status}`);
  }
  logger.info("Email sent", { subject });
}
