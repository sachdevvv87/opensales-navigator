# Changelog

All notable changes to OpenSales Navigator are documented here.

## [0.1.0] — 2026-03-04

### Initial MVP Release

**Features:**
- Multi-tenant authentication (JWT, bcrypt, RBAC roles)
- Organization workspaces with user invitation system
- Contact management — full CRUD, CSV import with column mapping, duplicate detection
- Company management — full CRUD, linked contacts
- Lead lists — static lists, add/remove members
- Activity tracking — notes, calls, emails, tasks with timeline view
- Dashboard with key metrics (contacts, companies, activities, tasks due)
- In-app notifications
- Saved searches
- Bulk actions — delete, assign, tag, change stage, add to list
- Docker Compose self-hosted deployment
- GitHub Actions CI (typecheck + lint)

**Tech stack:**
- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand
- Backend: Fastify 4, Prisma 5, PostgreSQL 16
- Infrastructure: Redis 7, MinIO, Docker Compose
- Monorepo: Turborepo + pnpm workspaces
