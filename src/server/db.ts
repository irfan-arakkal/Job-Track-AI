import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * A single shared Prisma client for the whole server.
 *
 * In development, Next.js hot-reloads modules on every save. Without this cache each reload
 * would create a new client (and a new connection pool) until Postgres runs out of connections.
 * Storing the instance on `globalThis` lets it survive reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // Prisma 7 talks to Postgres through a "driver adapter" that wraps the standard `pg` driver.
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
