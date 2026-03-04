# Contributing to OpenSales Navigator

Thank you for your interest in contributing! This guide will help you get set up.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (for local infrastructure)

## Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/sachdevvv87/opensales-navigator
cd opensales-navigator

# 2. Install dependencies
pnpm install

# 3. Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose -f docker-compose.dev.yml up -d

# 4. Set up environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

# 5. Run database migrations
pnpm db:migrate

# 6. Seed sample data
pnpm db:seed

# 7. Start all apps in dev mode
pnpm dev
```

Open http://localhost:3000 and log in with `admin@acme.com` / `password123`.

## Project Structure

```
apps/
  web/      Next.js 14 frontend
  api/      Fastify REST API
  worker/   BullMQ background workers
packages/
  database/ Prisma schema + migrations
  shared/   Zod schemas + TypeScript types
  ui/       shadcn/ui component library
infra/
  docker/   Dockerfiles
```

## Making Changes

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `pnpm typecheck` and `pnpm lint`
4. Commit and open a PR

## Commit Convention

Use conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` maintenance
- `refactor:` code improvement

## Code Style

- TypeScript everywhere — no `any` unless unavoidable
- Zod for all validation — never trust raw request bodies
- All DB queries must be org-scoped (`where: { orgId }`)
- Soft-delete contacts/companies — never hard delete user data
