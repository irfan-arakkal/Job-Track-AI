import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/env";
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { siteConfig } from "@/lib/site";
import { db } from "@/server/db";
import { isEmailConfigured, sendEmail } from "@/server/email";
import { logger } from "@/server/logger";
import { getStorage } from "@/server/storage";

const ONE_DAY_SECONDS = 60 * 60 * 24;
const ONE_HOUR_SECONDS = 60 * 60;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Emails a password reset link — or, in development without email set up, prints it. */
async function sendResetPasswordEmail({
  user,
  url,
}: {
  user: { email: string; name: string };
  url: string;
}) {
  if (!isEmailConfigured()) {
    if (env.NODE_ENV !== "production") {
      logger.info("Password reset link (email isn't configured, so it's printed here)", { url });
    } else {
      // The forgot-password page is hidden in this case; this only catches direct API calls.
      logger.warn("Password reset requested, but email isn't configured");
    }
    return;
  }
  try {
    await sendEmail({
      to: user.email,
      subject: `Reset your ${siteConfig.name} password`,
      text: `Hi ${user.name},\n\nSomeone (hopefully you) asked to reset your ${siteConfig.name} password. Open this link to choose a new one — it works once and expires in 1 hour:\n\n${url}\n\nIf you didn't ask for this, you can ignore this email; your password stays the same.`,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>Someone (hopefully you) asked to reset your ${siteConfig.name} password. The link below works once and expires in 1 hour.</p><p><a href="${escapeHtml(url)}">Choose a new password</a></p><p>If you didn't ask for this, you can ignore this email; your password stays the same.</p>`,
    });
  } catch (error) {
    // Don't surface this to the requester: the response must look the same whether or not the
    // address has an account.
    logger.error("Failed to send password reset email", { error });
  }
}

/**
 * Better Auth configuration — the single source of truth for authentication.
 *
 * Browser requests reach it through the catch-all route `src/app/api/auth/[...all]/route.ts`.
 * Server code calls it directly via `auth.api.*` (see `src/server/session.ts`).
 */
export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  // Users, sessions and accounts are stored in our Postgres via Prisma.
  database: prismaAdapter(db, { provider: "postgresql" }),

  user: {
    // Extra column on our users table that Better Auth should load into the session.
    // `input: false` means sign-up requests can't set it — it's changed in Settings only.
    additionalFields: {
      timezone: { type: "string", defaultValue: "UTC", input: false },
    },
    // Users can delete their account from Settings (password required, see the form).
    deleteUser: {
      enabled: true,
      // Database rows cascade-delete with the user; uploaded files live outside the database,
      // so remove them explicitly first.
      beforeDelete: async (user) => {
        const resumes = await db.resume.findMany({
          where: { userId: user.id },
          select: { storageKey: true },
        });
        const storage = getStorage();
        await Promise.all(
          resumes.map((r) =>
            storage
              .delete(r.storageKey)
              .catch((error) => logger.error("Failed to delete file", { error })),
          ),
        );
        logger.info("Account deleted", { userId: user.id });
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    // Log the user in straight after registering (no email verification yet — see docs).
    autoSignIn: true,
    // "Forgot password?": the link is single-use, expires after an hour, and using it signs the
    // account out everywhere (in case someone else had the old password).
    sendResetPassword: sendResetPasswordEmail,
    resetPasswordTokenExpiresIn: ONE_HOUR_SECONDS,
    revokeSessionsOnPasswordReset: true,
  },

  session: {
    // A session lasts 7 days, and is extended by another 7 days at most once a day while the
    // user stays active. Logging out deletes the session row, so the cookie stops working at once.
    expiresIn: 7 * ONE_DAY_SECONDS,
    updateAge: ONE_DAY_SECONDS,
  },

  // Brute-force protection for requests that come through /api/auth/*. Better Auth only enables
  // this in production by default; we turn it on everywhere so we can see it working locally.
  // Storage is in-memory for now — Phase 14/15 moves it to shared storage for multi-instance hosting.
  rateLimit: {
    enabled: true,
    // Counters in Postgres (rate_limits table): shared across instances, survive restarts.
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/change-password": { window: 60, max: 5 },
      "/delete-user": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },

  advanced: {
    // Only trust the IP header our hosting proxy sets; otherwise a client could send a fake
    // X-Forwarded-For with every request to get a fresh rate-limit bucket each time.
    ipAddress: { ipAddressHeaders: env.TRUSTED_IP_HEADERS.split(",").map((h) => h.trim()) },
  },

  // Server-side validation that Better Auth doesn't do for us: the display name.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const name = user.name.trim();
          if (name.length === 0 || name.length > NAME_MAX_LENGTH) {
            throw new APIError("BAD_REQUEST", {
              message: `Name must be between 1 and ${NAME_MAX_LENGTH} characters.`,
            });
          }
          return { data: { ...user, name } };
        },
      },
      update: {
        before: async (user) => {
          if (typeof user.name !== "string") return { data: user };
          const name = user.name.trim();
          if (name.length === 0 || name.length > NAME_MAX_LENGTH) {
            throw new APIError("BAD_REQUEST", {
              message: `Name must be between 1 and ${NAME_MAX_LENGTH} characters.`,
            });
          }
          return { data: { ...user, name } };
        },
      },
    },
  },

  // Lets `auth.api.*` calls inside Server Actions set cookies. Must stay the last plugin.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
