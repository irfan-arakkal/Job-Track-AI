# 18 — Deployment (Phase 15)

Two supported ways to run JobTrack AI in production:

|               | **A. Vercel + Neon + R2** (recommended) | **B. Docker (self-hosted)**  |
| ------------- | --------------------------------------- | ---------------------------- |
| Hosting       | Vercel (serverless)                     | any VPS / container platform |
| Database      | Neon (managed PostgreSQL)               | PostgreSQL container         |
| Resume files  | Cloudflare R2 (S3-compatible, private)  | Docker volume (or S3/R2)     |
| Daily job     | Vercel Cron (`vercel.json`)             | system cron / GitHub Actions |
| Cost to start | free tiers                              | a small VPS                  |

---

## Production environment variables

| Variable                                                                            | Required     | Example / notes                                                                              |
| ----------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                      | ✅           | Neon **direct** connection string (pooling off), `?sslmode=require`                          |
| `BETTER_AUTH_SECRET`                                                                | ✅           | `openssl rand -base64 32` — never reuse the dev value                                        |
| `BETTER_AUTH_URL`                                                                   | ✅           | `https://your-app.vercel.app` (no trailing slash)                                            |
| `NEXT_PUBLIC_APP_URL`                                                               | ✅           | same as above                                                                                |
| `TRUSTED_IP_HEADERS`                                                                | ✅           | Vercel: `x-vercel-forwarded-for` · nginx: `x-real-ip` — must be a header your proxy **sets** |
| `STORAGE_DRIVER`                                                                    | ✅ on Vercel | `s3` (Vercel has no persistent disk)                                                         |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | with `s3`    | R2: endpoint `https://<account-id>.r2.cloudflarestorage.com`, region `auto`                  |
| `CRON_SECRET`                                                                       | recommended  | `openssl rand -base64 32`; Vercel Cron sends it automatically                                |
| `ANTHROPIC_API_KEY`                                                                 | optional     | enables AI analysis and the assistant                                                        |
| `ANTHROPIC_MODEL`                                                                   | optional     | default `claude-opus-5-5`                                                                    |
| `LOG_LEVEL`                                                                         | optional     | `info` (default in production)                                                               |

The app validates these at startup (`src/env.ts`) and refuses to start with missing/invalid values
or with the placeholder auth secret.

---

## A. Vercel + Neon + Cloudflare R2 (step by step)

### 1. Database — Neon

1. Sign up at **neon.tech** → _Create project_ (region close to your Vercel region, PostgreSQL 16).
2. _Connect_ → turn **Connection pooling off** and copy the **direct** connection string. Keep
   `?sslmode=require`. This is `DATABASE_URL`. The build runs `prisma migrate deploy`, which needs
   a direct (session) connection; for a portfolio-sized app the direct connection is also fine at
   runtime.

### 2. File storage — Cloudflare R2 (optional)

Without a bucket the app still deploys and works; only resume uploads are refused with the clear
message "Resume uploads aren't set up on this deployment yet." (Vercel's disk is read-only).

1. Cloudflare dashboard → **R2** → _Create bucket_ (e.g. `jobtrack-resumes`). Leave public access **off**.
2. _Manage R2 API tokens_ → _Create API token_ with **Object Read & Write** on that bucket.
3. Note the **Access Key ID**, **Secret Access Key** and the **S3 endpoint**
   (`https://<account-id>.r2.cloudflarestorage.com`).

### 3. App — Vercel

1. Sign up at **vercel.com** with GitHub → _Add New… → Project_ → import `Job-Track-AI`.
   (Set the production branch to the branch you deploy, or merge into `main` first.)
2. Framework preset: **Next.js** (detected). Build command comes from `vercel.json`:
   `pnpm db:deploy && pnpm build` — migrations run **before** each build, so the schema is always
   up to date when new code goes live.
3. _Environment Variables_: add everything from the table above (`STORAGE_DRIVER=s3`,
   `TRUSTED_IP_HEADERS=x-vercel-forwarded-for`, your Neon URL, R2 keys, secrets).
4. _Deploy_. After the first deploy, set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to the final
   domain if it changed, and redeploy.

### 4. Daily reminders job

`vercel.json` schedules `GET /api/cron/reminders` every day at 06:00 UTC. With `CRON_SECRET` set,
Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. (Hobby plans allow daily crons.)

### 5. Optional: demo account

To let reviewers log in without signing up, seed once from your machine against production:

```bash
DATABASE_URL="<neon url>" NODE_ENV=production ALLOW_PRODUCTION_SEED=true pnpm db:seed
```

This creates `demo@jobtrack.dev` with sample data. Change the password in `prisma/seed.ts` first if
you don't want a publicly known one — or omit the seed and share screenshots instead.

---

## B. Docker (self-hosted)

```bash
cp .env.example .env.production          # fill in production values (see table)
echo 'POSTGRES_PASSWORD=<strong password>' >> .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

`docker-compose.prod.yml` starts PostgreSQL, runs `prisma migrate deploy` once (the `migrate` image
target), then starts the app on port 3000. The `runner` image:

- uses Next.js `output: "standalone"` — only the files the server needs (~small image);
- runs as an unprivileged `nextjs` user;
- has a `HEALTHCHECK` on `/api/health`;
- stores resumes in the `uploads` volume (or set `STORAGE_DRIVER=s3`).

Put a reverse proxy with HTTPS in front (Caddy, nginx, Traefik) and set `TRUSTED_IP_HEADERS` to the
header it sets (e.g. `x-real-ip`). Schedule the daily job:

```cron
0 6 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/reminders
```

---

## Build, logging and errors

- **Build:** `pnpm build` → `.next/standalone` (`next.config.ts`: `output: "standalone"`,
  `poweredByHeader: false`, security headers).
- **Logging:** `src/server/logger.ts` writes one **JSON object per line** in production (`time`,
  `level`, `message`, fields) — searchable in Vercel Logs, Datadog, CloudWatch… Never logs passwords,
  tokens or resume contents.
- **Errors:** route-level `error.tsx`, a root `global-error.tsx`, and safe API error shapes. Users see
  a reference (`digest`) that matches the server log entry.
- **Health:** `GET /api/health` → `200 {"status":"ok","database":"connected"}` or `503`. Use it for
  uptime monitoring (e.g. Better Stack, UptimeRobot).

## CI/CD

- **CI** (`.github/workflows/ci.yml`) on every PR and push to `main`: typecheck, lint, format, unit +
  integration tests (Postgres), production build, Playwright E2E, and a Docker image build.
- **CD:** Vercel's GitHub integration deploys every push to the production branch and creates a
  **preview deployment** for every pull request. Protect `main` so merges require green CI.

## Post-deploy checklist

- [ ] `https://<domain>/api/health` → `"database":"connected"`
- [ ] Register a new account, create an application, change its status, see it on the dashboard
- [ ] Upload a PDF resume and open it (R2 bucket shows the object under `resumes/<userId>/`)
- [ ] `curl -sI https://<domain>/login` shows `content-security-policy` and `strict-transport-security`
- [ ] Six wrong passwords in a minute → "Too many attempts"
- [ ] Settings → API tokens → create one; `curl` the MCP `tools/list` with it (see docs/13-mcp.md)
- [ ] With `ANTHROPIC_API_KEY` set: run an AI analysis and ask the assistant a question
- [ ] Vercel → Settings → Cron Jobs shows the reminders job; trigger it once manually

## What was verified in development

The production build was run as the standalone server (`node server.js`, exactly what the Docker
image runs): health check, login, all main pages, PDF upload/parsing and security headers worked,
with no errors in the log. The full Playwright suite runs against a production build. A Docker daemon
wasn't available in the development environment, so the image itself is built by the CI `docker` job.
