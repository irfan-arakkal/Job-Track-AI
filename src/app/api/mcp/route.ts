import { handleMcpRequest } from "@/server/mcp/server";

/**
 * MCP endpoint (Streamable HTTP transport). Authenticated with a personal API token:
 *   Authorization: Bearer jt_…
 * See docs/13-mcp.md for how to connect Claude Code, Claude Desktop or the MCP Inspector.
 */
export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
