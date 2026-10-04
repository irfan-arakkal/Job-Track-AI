import "server-only";

import { z } from "zod";

/**
 * Server-side environment variables, validated once at startup.
 *
 * Why: `process.env.X` is `string | undefined` and silently wrong values cause confusing
 * runtime bugs. Parsing with Zod fails fast with a clear message and gives us typed access.
 *
 * Rules:
 * - Import `env` from here instead of reading `process.env` directly in app code.
 * - Only variables prefixed with NEXT_PUBLIC_ are ever exposed to the browser.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "must be a postgresql:// URL" }),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${issues}\nSee .env.example for the expected values.`,
  );
}

// The .env.example placeholder is long enough to pass validation, so refuse it explicitly in
// production — shipping a publicly known secret would let anyone forge session cookies.
if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.BETTER_AUTH_SECRET.startsWith("replace-me")
) {
  throw new Error("BETTER_AUTH_SECRET is still the placeholder from .env.example.");
}

export const env = parsed.data;
export type Env = typeof env;
