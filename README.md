# OpenSales Navigator

> Open-source, self-hosted B2B sales intelligence platform — a LinkedIn Sales Navigator alternative you can run on your own infrastructure.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4-green)](https://fastify.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)

## Features

- **Contact Management** — Import, search, filter, and track 10,000s of contacts
- **Company Accounts** — Firmographic data linked to contacts
- **Lead Lists** — Static and smart lists to organize prospects
- **Activity Timeline** — Notes, calls, emails, tasks on every contact
- **Dashboard** — Key metrics and recent activity at a glance
- **Multi-tenant** — One deployment, multiple teams/workspaces
- **Self-hosted** — Your data never leaves your server
- **Open source** — MIT licensed, community-driven

## Quick Start (Docker)

**Prerequisites:** Docker Desktop, Git

```bash
# 1. Clone
git clone https://github.com/sachdevvv87/opensales-navigator
cd opensales-navigator

# 2. Configure
cp .env.example .env
# Edit .env — set JWT_SECRET (required)

# 3. Start
docker compose up -d

# 4. Run migrations + seed
docker compose exec api npx prisma migrate deploy
docker compose exec api node -e "require('./dist/seed')"
```

Open **http://localhost:3000** — log in with `admin@acme.com` / `password123`

## Development Setup

```bash
# Prerequisites: Node.js 20, pnpm 9, Docker Desktop

git clone https://github.com/sachdevvv87/opensales-navigator
cd opensales-navigator
pnpm install

# Start infrastructure only (postgres + redis + minio)
docker compose -f docker-compose.dev.yml up -d

# Configure environment
cp .env.example .env

# Migrate + seed database
pnpm db:migrate
pnpm db:seed

# Start all apps with hot reload
pnpm dev
```

| App | URL |
|-----|-----|
| Web app | http://localhost:3000 |
| API | http://localhost:4000 |
| API health | http://localhost:4000/health |
| MinIO console | http://localhost:9001 |

**Default login:** `admin@acme.com` / `password123`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| State | Zustand, TanStack Query |
| Backend | Fastify 4, TypeScript |
| Database | PostgreSQL 16, Prisma 5 |
| Cache / Queue | Redis 7, BullMQ |
| File storage | MinIO (S3-compatible) |
| Monorepo | Turborepo, pnpm workspaces |
| Containerization | Docker, Docker Compose |

## Roadmap

- [x] v0.1.0 — MVP: contacts, companies, lists, activities, auth
- [ ] v0.2.0 — Advanced search (Elasticsearch), 40+ filters, saved search alerts
- [ ] v0.3.0 — CRM integrations (HubSpot, Salesforce, Pipedrive)
- [ ] v0.4.0 — Data enrichment (Clearbit, Hunter.io, Apollo.io)
- [ ] v1.0.0 — Analytics dashboards, smart links, Kubernetes Helm chart

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome!

## License

MIT © [sachdevvv87](https://github.com/sachdevvv87/sachdevvv87)
