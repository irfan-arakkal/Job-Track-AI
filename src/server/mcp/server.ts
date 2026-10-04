import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { AppError, RateLimitError } from "@/server/errors";
import { logger } from "@/server/logger";
import { checkRateLimit } from "@/server/rate-limit";
import { authenticateApiToken, bearerToken } from "@/server/services/api-tokens";
import { allTools, runTool, type ToolContext } from "@/server/tools";

/*
 * JobTrack MCP server.
 *
 *   MCP client (Claude Code, Claude Desktop via mcp-remote, MCP Inspector, an AI agent…)
 *     ── HTTP POST /api/mcp  (JSON-RPC: initialize, tools/list, tools/call)
 *        Authorization: Bearer jt_…
 *   → authenticate the token → user id + time zone
 *   → build an MCP server whose tools are bound to THAT user
 *   → tool handlers call the same service layer as the web app (queries scoped by user id)
 *
 * Stateless: every HTTP request gets a fresh server + transport, so it works on serverless
 * hosts and needs no session storage.
 */

export const MCP_SERVER_INFO = { name: "jobtrack-ai", version: "1.0.0" };

function buildServer(ctx: ToolContext) {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions:
      "Tools for the authenticated user's JobTrack AI job search: applications, interviews, statistics and follow-ups. All data belongs to the token's owner.",
  });

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema.shape,
        annotations: {
          readOnlyHint: tool.readOnly,
          destructiveHint: tool.destructive ?? false,
          idempotentHint: tool.readOnly,
          // Tools only touch JobTrack's own database, not the outside world.
          openWorldHint: false,
        },
      },
      async (args: unknown) => {
        try {
          const result = await runTool(tool, ctx, args);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
          const message =
            error instanceof AppError
              ? error.message
              : error instanceof Error && error.name === "ZodError"
                ? `Invalid arguments: ${error.message}`
                : "The tool failed. Please try again.";
          if (
            !(error instanceof AppError) &&
            !(error instanceof Error && error.name === "ZodError")
          ) {
            logger.error("MCP tool failed", { tool: tool.name, error });
          }
          return { isError: true, content: [{ type: "text" as const, text: message }] };
        }
      },
    );
  }
  return server;
}

function jsonRpcError(status: number, message: string, headers: HeadersInit = {}) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    { status, headers },
  );
}

/** Handles one MCP HTTP request end to end. */
export async function handleMcpRequest(request: Request) {
  const auth = await authenticateApiToken(bearerToken(request));
  if (!auth) {
    return jsonRpcError(
      401,
      "Missing or invalid API token. Create one in JobTrack → Settings → API tokens.",
      {
        "WWW-Authenticate": 'Bearer realm="jobtrack-mcp"',
      },
    );
  }

  try {
    checkRateLimit(`mcp:${auth.tokenId}`, 120, 60_000); // 120 requests per minute per token
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRpcError(429, error.message, { "Retry-After": String(error.retryAfterSeconds) });
    }
    throw error;
  }

  const server = buildServer({ userId: auth.userId, timeZone: auth.timeZone });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true, // plain JSON responses instead of an SSE stream
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
