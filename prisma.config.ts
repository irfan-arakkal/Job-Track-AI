// Prisma CLI configuration (migrate, generate, studio).
// Prisma 7 no longer reads `.env` on its own, so we load it explicitly here.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `pnpm db:seed` runs this to load the demo account and sample data.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read directly (not via `env()`) so `prisma generate` still works on a fresh
    // install or in CI where no database URL is set. Migrations do need it.
    url: process.env.DATABASE_URL,
  },
});
