import path from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ quiet: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws when imported outside a React Server Component bundle. Tests run
      // in plain Node, so we swap it for an empty module.
      "server-only": path.resolve(__dirname, "tests/support/empty-module.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          // Point the app's db client at the TEST database — never the dev one.
          env: { DATABASE_URL: testDatabaseUrl ?? "", NODE_ENV: "test" },
          globalSetup: ["tests/support/integration-global-setup.ts"],
          // Tests share one database, so run files one at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
