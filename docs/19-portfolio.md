# 19 — Portfolio Kit (Phase 16)

Ready-to-use text for your resume, LinkedIn and portfolio, plus talking points for interviews.
Replace `<live URL>` once deployed (see docs/18-deployment.md).

## Links

- **Code:** https://github.com/irfan-arakkal/Job-Track-AI
- **Live demo:** `<live URL>`
- **Demo login:** `demo@jobtrack.dev` / `demo-password-123` (or change it before seeding production)

## Resume — project entry

**JobTrack AI** — Full-stack job application tracker with AI features · _Next.js, TypeScript, PostgreSQL, Prisma, Claude API, MCP_

- Built a multi-user SaaS app (Next.js 16 App Router, React 19, TypeScript, Tailwind) to track job applications, interviews, resumes and analytics, backed by PostgreSQL and Prisma.
- Implemented secure authentication (database sessions, rate limiting, CSRF origin checks) and enforced per-user data isolation in both the service layer and the database via composite foreign keys.
- Integrated the Claude API for resume-vs-job analysis using structured outputs validated with Zod, and an AI assistant that answers from user data through tool calling.
- Built an MCP (Model Context Protocol) server exposing 8 tools over Streamable HTTP with hashed, revocable API tokens, letting AI clients like Claude Code manage applications securely.
- Wrote 158 unit/integration tests against real PostgreSQL and 8 Playwright end-to-end tests; set up GitHub Actions CI, Docker images and Vercel deployment with a nonce-based CSP and security review.

_Short version (3 bullets):_

- Built a full-stack job tracker (Next.js, TypeScript, PostgreSQL/Prisma) with authentication, per-user data isolation, file uploads, reminders and analytics.
- Added AI features with the Claude API (structured resume analysis, tool-using assistant) and an MCP server for external AI clients.
- 166 automated tests (Vitest + Playwright), CI/CD, Docker, documented security review.

## LinkedIn / portfolio description

> **JobTrack AI — an AI-powered job search tracker**
>
> I built JobTrack AI to learn full-stack development end to end. It's a Next.js and TypeScript app
> where job seekers track applications from wishlist to offer, schedule interviews (time-zone aware),
> store resumes privately and see analytics like response and interview rates.
>
> The AI side uses Anthropic's Claude API: a resume analysis that compares a CV with a job
> description and returns a validated, structured report, and an assistant that answers questions
> like "Which companies haven't responded?" by calling tools over the user's own data — never
> inventing facts. I also built an MCP server, so AI clients such as Claude Code can read and update
> applications with a revocable token.
>
> Under the hood: PostgreSQL + Prisma with ownership enforced by composite foreign keys, Better Auth
> sessions, Zod validation everywhere, a nonce-based Content Security Policy, database-backed rate
> limiting, 166 automated tests (Vitest + Playwright) and CI on GitHub Actions.
>
> Code: github.com/irfan-arakkal/Job-Track-AI · Demo: `<live URL>`

**Short (portfolio card):** _Full-stack job tracker with Claude-powered resume analysis, a
tool-using AI assistant and an MCP server. Next.js 16 · TypeScript · PostgreSQL · Prisma · Better
Auth · Playwright._

## Interview talking points

Use these as 1–2 minute stories. Each has a "what I'd change" to show judgement.

1. **"How do you stop users seeing each other's data?"**
   Every entry point authenticates first and passes the session's user id to a service layer that
   filters every query by it; foreign ids return 404, not 403. As a second layer, child tables use
   composite foreign keys `(parentId, userId)`, so the database itself rejects a row linking one
   user's interview to another user's application. Tests prove it — I removed a `userId` filter on
   purpose and watched the test fail. _(docs/03, docs/06)_

2. **"How did you make the AI output trustworthy?"**
   Structured outputs force JSON matching a schema; then a stricter Zod schema checks values (score
   0–100, bounded lists) before anything is stored, plus a DB CHECK constraint. Resume and job text
   are framed as untrusted data to resist prompt injection. Errors (timeouts, 429s, refusals) map to
   clear messages. _(docs/11)_

3. **"How does the assistant avoid hallucinating?"**
   It doesn't get a data dump; it gets read-only tools and a prompt that requires looking things up
   and saying "I don't have that information" otherwise. Relative dates are resolved from today's
   date in the user's time zone. _(docs/12)_

4. **"What is MCP and why build a server?"**
   An open protocol for connecting AI apps to tools. I defined tools once and exposed them both to
   the in-app assistant and via MCP. Auth is a hashed bearer token; tools never take a user id, so a
   client can't target someone else's data. _(docs/13)_

5. **"A tricky bug you fixed?"** Pick one:
   - Interview times around daylight-saving changes (ambiguous/skipped local times) — implemented
     Temporal-style "compatible" disambiguation and unit-tested Berlin's DST nights. _(docs/09)_
   - Rate limits could be bypassed by spoofing `X-Forwarded-For` — restricted IP detection to a
     trusted proxy header and moved counters to Postgres with an atomic upsert (concurrency-tested). _(docs/17)_
   - React 19 resets forms after a form action, wiping a pasted job description on validation error. _(docs/11)_

6. **"How did you test it?"** Pyramid: pure-logic unit tests, integration tests on a real Postgres
   (because the important bugs are missing filters/constraints), Playwright E2E on a production build
   with its own database. AI is tested with an injected fake so tests cost nothing. _(docs/16)_

7. **"What would you do next?"** Email verification + reminders by email, 2FA, OAuth for MCP,
   streaming assistant responses, a Kanban view. Also: move the in-progress decisions documented in
   the security review (e.g. `style-src 'unsafe-inline'`) to stricter settings.

## Demo script (5 minutes)

1. Log in as the demo user → dashboard: KPIs, reminders, pipeline, upcoming interviews.
2. Applications → search "react" → open one → change status → note the history entry.
3. Analytics → switch to 12 months → explain how response rate uses status history.
4. Resumes → AI analysis → show the structured result.
5. AI Assistant → "Which applications should I follow up on?" → point out "Checked your follow-ups".
6. Settings → create an API token → in Claude Code: "Using jobtrack, list my interviews next week".
7. Close with the architecture diagram and one security story.
