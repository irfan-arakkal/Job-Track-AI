# 11 — AI Resume Analysis (Phase 8)

## Flow

```
Analyse form (or POST /api/v1/analyses)
  → requireUser → Zod (analysisRequestSchema)
  → analyzeResume(userId, request, analyzer)            src/server/services/analysis.ts
      1. resume: requested or primary, owned by user, has extracted text
      2. job description: pasted, or the owned application's saved one
      3. rate limit: 20 analyses / user / day (after cheap checks)
      4. analyzer(...)  → Claude API (structured output)  src/server/ai/resume-analyzer.ts
      5. analysisResultSchema.safeParse(output)            ← validate before trusting
      6. store ResumeAnalysis (score + JSON result + model)
  → result page /resumes/analyses/:id
```

## The Claude API call

| Setting                                                         | Value                                            | Why                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Model                                                           | `claude-opus-5-5` (`ANTHROPIC_MODEL`)            | Anthropic's current default model                                                     |
| Endpoint                                                        | `client.beta.messages.parse`                     | parses structured output into a typed object                                          |
| `output_config.format`                                          | `betaZodOutputFormat(analysisModelOutputSchema)` | **structured outputs**: the reply must match our JSON schema                          |
| `output_config.effort`                                          | `medium`                                         | enough reasoning for one document comparison, moderate cost                           |
| `fallbacks: "default"` + beta `server-side-fallback-2026-07-01` | on                                               | if a safety classifier declines, the API retries on a fallback model in the same call |
| `max_tokens`                                                    | 16,000                                           | non-streaming default; a `max_tokens` stop is treated as an incomplete answer         |
| Client                                                          | `timeout: 90s`, `maxRetries: 2`                  | retries 429/5xx/network with backoff, then fails fast                                 |

**Prompt design:** the system prompt sets the role, a scoring rubric, "never invent experience",
and treats the resume and job description — wrapped in `<resume>` / `<job_description>` tags — as
**untrusted data, not instructions** (prompt-injection defence).

## Two layers of validation

1. **Structured outputs** guarantee valid JSON with the right fields and types. Constraints the API
   doesn't enforce (score 0–100) are passed to the model as hints by the SDK.
2. **`analysisResultSchema`** (Zod) then checks values: integer score 0–100, non-empty summary,
   at most 15 items per list, 600 characters per item. Anything else → `502` and **nothing is stored**.

The database adds a third net: `CHECK ("matchScore" BETWEEN 0 AND 100)`.

## Error handling (`src/server/ai/client.ts` → `toAiError`)

| Situation                      | User sees                                                | HTTP |
| ------------------------------ | -------------------------------------------------------- | ---- |
| No `ANTHROPIC_API_KEY`         | "AI features aren't set up…" (page shows a setup notice) | 503  |
| Timeout                        | "The AI took too long to respond"                        | 504  |
| Claude rate limit              | "The AI service is busy… try again in a minute"          | 429  |
| Our daily limit                | "Too many requests…"                                     | 429  |
| 5xx / 529 overloaded / network | "temporarily unavailable"                                | 503  |
| Bad credentials                | "isn't configured correctly" (details logged)            | 503  |
| Refusal (after fallbacks)      | "The AI declined to analyse this content"                | 422  |
| Incomplete / invalid answer    | "returned an unexpected answer"                          | 502  |

SDK error classes never leave `client.ts`; raw messages are only logged.

## Testing without spending money

`analyzeResume` takes the analyzer as a parameter, so integration tests pass a fake
(`tests/integration/analysis-service.test.ts`: success, application JD, four kinds of invalid AI
output, ownership, missing resume text, daily limit, error pass-through). `tests/unit/ai-errors.test.ts`
maps real SDK error classes. For a full browser run, point the SDK at a local stub server with
`ANTHROPIC_BASE_URL` — this is how the end-to-end flow was verified during development.

## Privacy

The resume text and job description are sent to the Claude API only when the user clicks
"Analyse match" (the form says so). Results are stored per user and deleted with the account.
