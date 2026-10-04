# syntax=docker/dockerfile:1
# Multi-stage build: dependencies → build → small runtime image (Next.js "standalone" output).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- 1. Install dependencies (cached unless the lockfile changes) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

# ---- 2. Build the app ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders: env.ts validates shapes at build time, but no queries run during the
# build. Real values are provided at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    BETTER_AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime" \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm db:generate && pnpm build

# ---- 3. Migration runner (has the Prisma CLI): `docker compose run --rm migrate` ----
FROM base AS migrate
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY prisma.config.ts package.json ./
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# ---- 4. Runtime: only the standalone server and static assets ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Run as an unprivileged user, never root.
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Writable folder for local resume storage (mount a volume, or use STORAGE_DRIVER=s3).
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
