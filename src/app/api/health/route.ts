import { db } from "@/server/db";

// Always run at request time; a cached health check would be meaningless.
export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness + database connectivity check.
 * Used locally to verify setup, and later by the hosting platform / uptime monitors.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      database: "connected",
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    // Log the real error on the server; never send connection details to the client.
    console.error("[health] database check failed", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
