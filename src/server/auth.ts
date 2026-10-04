import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/env";
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { siteConfig } from "@/lib/site";
import { db } from "@/server/db";

const ONE_DAY_SECONDS = 60 * 60 * 24;

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

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    // Log the user in straight after registering (no email verification yet — see docs).
    autoSignIn: true,
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
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
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
    },
  },

  // Lets `auth.api.*` calls inside Server Actions set cookies. Must stay the last plugin.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
