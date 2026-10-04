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

  // File storage for resumes: a private local folder in development, S3/R2 in production.
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // AI (Phase 8+). Optional: without a key the app works and AI features explain how to enable them.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
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

if (
  parsed.data.STORAGE_DRIVER === "s3" &&
  !(parsed.data.S3_BUCKET && parsed.data.S3_ACCESS_KEY_ID && parsed.data.S3_SECRET_ACCESS_KEY)
) {
  throw new Error("STORAGE_DRIVER=s3 needs S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
}

export const env = parsed.data;
export type Env = typeof env;
