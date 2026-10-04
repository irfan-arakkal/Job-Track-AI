import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applicationInputSchema } from "@/features/applications/schemas";
import { handleMcpRequest } from "@/server/mcp/server";
import { resetRateLimits } from "@/server/rate-limit";
import { createApplication } from "@/server/services/applications";
import {
  authenticateApiToken,
  createApiToken,
  hashToken,
  revokeApiToken,
} from "@/server/services/api-tokens";

import { db, factory, resetDatabase } from "../support/db";

const URL_ = "http://localhost/api/mcp";
const clients: Client[] = [];

/** A real MCP client whose HTTP requests go straight to our route handler (no network). */
async function connect(token?: string) {
  const transport = new StreamableHTTPClientTransport(new URL(URL_), {
    requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    fetch: (input, init) => handleMcpRequest(new Request(input, init)),
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  clients.push(client);
  return client;
}

const text = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { type: string; text: string }[])[0]?.text ?? "";

describe("MCP server", () => {
  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimits();
  });
  afterEach(async () => {
    await Promise.all(clients.splice(0).map((c) => c.close().catch(() => undefined)));
  });

  it("rejects requests without a valid token (401)", async () => {
    await expect(connect()).rejects.toThrow();
    await expect(connect("jt_not-a-real-token")).rejects.toThrow();

    const response = await handleMcpRequest(
      new Request(URL_, {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("lists all tools with safety annotations", async () => {
    const user = await factory.user();
    const { token } = await createApiToken(user.id, "test");
    const client = await connect(token);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "create_application",
      "delete_application",
      "get_application",
      "get_applications",
      "get_follow_up_candidates",
      "get_interviews",
      "get_statistics",
      "update_application",
    ]);
    const del = tools.find((t) => t.name === "delete_application");
    expect(del?.annotations).toMatchObject({ destructiveHint: true, readOnlyHint: false });
    expect(tools.find((t) => t.name === "get_statistics")?.annotations?.readOnlyHint).toBe(true);
    // No tool lets the client choose a user.
    for (const tool of tools) {
      expect(Object.keys(tool.inputSchema.properties ?? {}).some((k) => /user/i.test(k))).toBe(
        false,
      );
    }
  });

  it("runs tools as the token's owner and never exposes other users' data", async () => {
    const alice = await factory.user();
    const bob = await factory.user();
    const bobsApp = await createApplication(
      bob.id,
      applicationInputSchema.parse({ companyName: "Bob Corp", jobTitle: "Secret role" }),
    );
    const { token } = await createApiToken(alice.id, "alice");
    const client = await connect(token);

    const created = await client.callTool({
      name: "create_application",
      arguments: { companyName: "Acme", jobTitle: "Platform Engineer" },
    });
    expect(created.isError).toBeFalsy();
    const { id } = JSON.parse(text(created)) as { id: string };

    await client.callTool({ name: "update_application", arguments: { id, status: "INTERVIEW" } });
    const list = JSON.parse(
      text(await client.callTool({ name: "get_applications", arguments: {} })),
    ) as {
      applications: { company: string; status: string }[];
    };
    expect(list.applications).toEqual([
      expect.objectContaining({ company: "Acme", status: "INTERVIEW" }),
    ]);

    const peek = await client.callTool({ name: "get_application", arguments: { id: bobsApp.id } });
    expect(peek.isError).toBe(true);
    expect(text(peek)).toBe("Application not found.");

    const del = await client.callTool({
      name: "delete_application",
      arguments: { id: bobsApp.id },
    });
    expect(del.isError).toBe(true);
    expect(await db.application.count({ where: { userId: bob.id } })).toBe(1);
  });

  it("reports invalid arguments as a tool error", async () => {
    const user = await factory.user();
    const { token } = await createApiToken(user.id, "t");
    const client = await connect(token);
    const result = await client.callTool({
      name: "update_application",
      arguments: { id: "x", status: "HIRED" },
    });
    expect(result.isError).toBe(true);
  });

  it("stops working as soon as the token is revoked or expires", async () => {
    const user = await factory.user();
    const { id, token } = await createApiToken(user.id, "t");
    expect(await authenticateApiToken(token)).toMatchObject({ userId: user.id });

    await revokeApiToken(user.id, id);
    expect(await authenticateApiToken(token)).toBeNull();
    await expect(connect(token)).rejects.toThrow();

    const expiring = await createApiToken(user.id, "short", 7);
    expect(
      await authenticateApiToken(expiring.token, new Date(Date.now() + 8 * 86_400_000)),
    ).toBeNull();
  });

  it("stores only a hash of the token", async () => {
    const user = await factory.user();
    const { token } = await createApiToken(user.id, "t");
    const row = await db.apiToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.prefix).toBe(token.slice(0, 7));
  });

  it("won't let another user revoke your token", async () => {
    const alice = await factory.user();
    const bob = await factory.user();
    const { id, token } = await createApiToken(alice.id, "t");
    await expect(revokeApiToken(bob.id, id)).rejects.toThrow("Token not found.");
    expect(await authenticateApiToken(token)).not.toBeNull();
  });
});
