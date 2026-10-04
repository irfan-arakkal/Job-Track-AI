# JobTrack AI

A full-stack job application tracker with AI resume analysis, a grounded AI assistant and an
MCP server — built incrementally as a portfolio project.

**Status:** Phase 12 — analytics complete.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 7 ·
Zod 4 · Better Auth · shadcn/ui (Radix) · React Hook Form · ESLint · Prettier · Docker Compose · pnpm

Testing: Vitest (unit + integration against a real Postgres)

AI: Claude API (Anthropic TypeScript SDK, structured outputs)

MCP: official TypeScript SDK (Streamable HTTP)

Planned: Playwright

## Local setup

**Prerequisites:** Node.js 22 (see `.nvmrc`), pnpm (`corepack enable`), Docker Desktop.

```bash
git clone https://github.com/irfan-arakkal/Job-Track-AI.git
cd Job-Track-AI
cp .env.example .env        # then set BETTER_AUTH_SECRET (see the comment in the file)
pnpm install                # also generates the Prisma client
pnpm db:up                  # starts PostgreSQL in Docker and waits until healthy
pnpm db:migrate             # creates the database tables
pnpm db:seed                # optional: demo account demo@jobtrack.dev / demo-password-123
pnpm dev                    # http://localhost:3000
```

Verify: open <http://localhost:3000/api/health> → `{"status":"ok","database":"connected",...}`,
then create an account at <http://localhost:3000/register>.

## Scripts

| Script                  | What it does                                     |
| ----------------------- | ------------------------------------------------ |
| `pnpm dev`              | Start the dev server (Turbopack)                 |
| `pnpm build`            | Production build                                 |
| `pnpm check`            | Typecheck + lint + format check (what CI runs)   |
| `pnpm format`           | Format all files with Prettier                   |
| `pnpm db:up/down`       | Start / stop the local Postgres container        |
| `pnpm db:migrate`       | Create and apply a migration from schema changes |
| `pnpm db:generate`      | Regenerate the typed Prisma client               |
| `pnpm db:studio`        | Browse the database in Prisma Studio             |
| `pnpm db:seed`          | Load the demo account and sample data            |
| `pnpm db:reset`         | Drop everything, re-run all migrations           |
| `pnpm test`             | Run all tests (unit + integration)               |
| `pnpm test:unit`        | Fast tests, no database                          |
| `pnpm test:integration` | Tests against the `jobtrack_test` database       |

## Project structure

```
prisma/              schema.prisma, migrations
prisma.config.ts     Prisma CLI config (loads .env)
docker-compose.yml   local PostgreSQL (+ jobtrack_test database)
src/
  app/
    (auth)/          login + register pages
    (app)/           signed-in pages (dashboard, applications, ... settings)
    api/             route handlers: auth, health, v1 REST
  components/
    ui/              shadcn-style primitives (Button, Input, Card, ...)
    layout/          app shell, sidebar, mobile nav, user menu
    shared/          reusable pieces (PageHeader, FormField, ComingSoon, Logo)
  features/          feature code (auth forms + schemas, later: applications, ...)
  env.ts             Zod-validated environment variables
  lib/               code safe for server and client
  proxy.ts           optimistic route protection
  server/            server-only code: db client, auth config, session helpers, services/
  generated/prisma/  generated Prisma client (git-ignored)
tests/
  unit/              pure logic (no database)
  integration/       services + constraints against a real test database
docs/                requirements, architecture, database, API, roadmap
```

## Planning docs

1. [Product requirements & user stories](docs/01-product-requirements.md)
2. [Architecture & folder structure](docs/02-architecture.md)
3. [Database design & ERD](docs/03-database.md)
4. [API requirements](docs/04-api.md)
5. [Development milestones](docs/05-roadmap.md)
6. [Authentication & authorization](docs/06-authentication.md)
7. [Job applications](docs/07-applications.md)
8. [Dashboard](docs/08-dashboard.md)
9. [Interviews & time zones](docs/09-interviews.md)
10. [Resumes & file security](docs/10-resumes.md)
11. [AI resume analysis](docs/11-ai-analysis.md)
12. [AI assistant & tools](docs/12-ai-assistant.md)
13. [MCP server](docs/13-mcp.md)
14. [Follow-up reminders](docs/14-reminders.md)
15. [Analytics](docs/15-analytics.md)
