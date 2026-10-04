# 12 — AI Assistant (Phase 9)

## How it answers from your data — and only your data

```
Chat UI ──POST /api/v1/assistant { messages }──► withAuth (session) → rate limit (60/h) → Zod
          runAssistant(ctx = { userId, timeZone }, history)          src/server/ai/assistant.ts
            └─ client.beta.messages.toolRunner({ tools: read-only JobTrack tools, … })
                 Claude ──tool_use: get_interviews { from, to }──► tool.run(ctx, input)
                                                                      └─ services (where userId = ctx.userId)
                 Claude ◄──tool_result: JSON─────────────────────────┘
                 … (up to 8 rounds) … final text answer
          ◄── { reply, toolsUsed }
```

- **Tools, not a data dump.** Claude gets five read-only tools (`get_applications`,
  `get_application`, `get_interviews`, `get_statistics`, `get_follow_up_candidates`) and fetches
  exactly what a question needs. The SDK's **tool runner** drives the loop.
- **No user id in any tool.** Handlers receive `ctx.userId` from the session; the model has no
  parameter it could use to ask for another user's data (enforced by a test).
- **Grounded answers.** The system prompt requires looking data up before answering, forbids
  inventing applications, dates or numbers, and asks for "I don't have that information" when tools
  return nothing. It also gives today's date in the user's time zone so "next week" becomes an
  explicit `from`/`to` range.
- **Read-only.** The assistant can't create, change or delete anything; it explains how to do that
  in the app. (Write tools exist in the shared registry for the MCP server, Phase 10.)
- **Untrusted content.** Notes and job descriptions can contain text that looks like instructions;
  the prompt tells Claude to treat tool results as data.

## Tool registry (`src/server/tools/index.ts`)

Each tool: `name`, `title`, `description` (written for the model), a Zod `inputSchema`,
`readOnly` / `destructive` flags, and `run(ctx, input)`. `runTool()` validates input first.
The same definitions are exposed over MCP in Phase 10 — one implementation, two interfaces.

## Request settings

`claude-opus-5-5`, `effort: "medium"`, `max_iterations: 8`, `max_tokens: 16000`, server-side
refusal fallback (`fallbacks: "default"`). Tool errors are returned to the model as
`{ "error": "Application not found." }` so it can explain them; unexpected errors are logged.

## Conversation state

The browser keeps the conversation (text only) and sends up to the last 30 messages, each at
most 4,000 characters, starting and ending with a user message (validated). Nothing is stored
server-side. Replies are rendered from Markdown **without raw HTML**.

## Verified

- `tests/integration/tools.test.ts`: no tool takes a user id; read and write tools are scoped to the
  caller; date filtering; follow-up rules; statistics computed from status history.
- End-to-end in a browser against a local stub of the Messages API (`ANTHROPIC_BASE_URL`): the
  stub requested `get_statistics`, the tool ran against the real database, and the answer
  displayed the user's real numbers with "Checked your statistics".
