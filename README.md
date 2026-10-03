# JobTrack AI

A full-stack job application tracker with AI resume analysis, a grounded AI assistant and an
MCP server — built incrementally as a portfolio project.

**Status:** Phase 1 — project setup complete.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 7 ·
Zod 4 · ESLint · Prettier · Docker Compose · pnpm

Planned: Better Auth · Claude API · MCP TypeScript SDK · Vitest · Playwright

## Local setup

**Prerequisites:** Node.js 22 (see `.nvmrc`), pnpm (`corepack enable`), Docker Desktop.

```bash
git clone https://github.com/irfan-arakkal/Job-Track-AI.git
cd Job-Track-AI
cp .env.example .env        # default values match docker-compose.yml
pnpm install                # also generates the Prisma client
pnpm db:up                  # starts PostgreSQL in Docker and waits until healthy
pnpm dev                    # http://localhost:3000
```

Verify: open <http://localhost:3000/api/health> → `{"status":"ok","database":"connected",...}`.

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
  app/               routes (pages + API route handlers)
  env.ts             Zod-validated environment variables
  lib/               code safe for server and client
  server/            server-only code (db client, later: auth, services, AI, MCP)
  generated/prisma/  generated Prisma client (git-ignored)
docs/                requirements, architecture, database, API, roadmap
```

## Planning docs

1. [Product requirements & user stories](docs/01-product-requirements.md)
2. [Architecture & folder structure](docs/02-architecture.md)
3. [Database design & ERD](docs/03-database.md)
4. [API requirements](docs/04-api.md)
5. [Development milestones](docs/05-roadmap.md)
