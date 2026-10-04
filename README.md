# JobTrack AI

A full-stack job application tracker with AI resume analysis, a grounded AI assistant and an
MCP server — built incrementally as a portfolio project.

**Status:** Phase 2 — authentication complete (register, login, logout, protected routes).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 7 ·
Zod 4 · Better Auth · shadcn/ui (Radix) · React Hook Form · ESLint · Prettier · Docker Compose · pnpm

Planned: Claude API · MCP TypeScript SDK · Vitest · Playwright

## Local setup

**Prerequisites:** Node.js 22 (see `.nvmrc`), pnpm (`corepack enable`), Docker Desktop.

```bash
git clone https://github.com/irfan-arakkal/Job-Track-AI.git
cd Job-Track-AI
cp .env.example .env        # then set BETTER_AUTH_SECRET (see the comment in the file)
pnpm install                # also generates the Prisma client
pnpm db:up                  # starts PostgreSQL in Docker and waits until healthy
pnpm db:migrate             # creates the database tables
pnpm dev                    # http://localhost:3000
```

Verify: open <http://localhost:3000/api/health> → `{"status":"ok","database":"connected",...}`,
then create an account at <http://localhost:3000/register>.

## Scripts

| Script             | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Start the dev server (Turbopack)                 |
| `pnpm build`       | Production build                                 |
| `pnpm check`       | Typecheck + lint + format check (what CI runs)   |
| `pnpm format`      | Format all files with Prettier                   |
| `pnpm db:up/down`  | Start / stop the local Postgres container        |
| `pnpm db:migrate`  | Create and apply a migration from schema changes |
| `pnpm db:generate` | Regenerate the typed Prisma client               |
| `pnpm db:studio`   | Browse the database in Prisma Studio             |

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
  server/            server-only code: db client, auth config, session helpers
  generated/prisma/  generated Prisma client (git-ignored)
docs/                requirements, architecture, database, API, roadmap
```

## Planning docs

1. [Product requirements & user stories](docs/01-product-requirements.md)
2. [Architecture & folder structure](docs/02-architecture.md)
3. [Database design & ERD](docs/03-database.md)
4. [API requirements](docs/04-api.md)
5. [Development milestones](docs/05-roadmap.md)
6. [Authentication & authorization](docs/06-authentication.md)
