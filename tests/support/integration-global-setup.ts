import { execSync } from "node:child_process";

/**
 * Runs once before the integration tests: applies all migrations to the test database so its
 * schema matches the code. `migrate deploy` only applies committed migrations (no prompts).
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Copy it from .env.example into your .env.");
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must point to a different database than DATABASE_URL.");
  }
  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
