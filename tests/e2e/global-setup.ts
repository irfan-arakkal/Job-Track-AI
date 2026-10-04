import { execSync } from "node:child_process";

import { config as loadEnv } from "dotenv";

/** Fresh e2e database before every run: apply migrations, then wipe data and create test users. */
export default function globalSetup() {
  loadEnv({ quiet: true });
  const url = process.env.E2E_DATABASE_URL!;
  if (!url.includes("e2e"))
    throw new Error("Refusing to reset a database whose URL doesn't contain 'e2e'.");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("pnpm exec prisma migrate deploy", { env, stdio: "pipe" });
  execSync("pnpm exec tsx tests/e2e/seed-users.ts", { env, stdio: "inherit" });
}
