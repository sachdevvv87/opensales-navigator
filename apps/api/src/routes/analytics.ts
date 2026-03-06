import { FastifyPluginAsync } from "fastify";
import { requireRole, orgScope } from "../plugins/auth";
import { prisma } from "@opensales/database";

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // All analytics require at least SALES_REP
  fastify.addHook("preHandler", requireRole("ORG_ADMIN", "MANAGER", "SALES_REP"));

  // GET /analytics/pipeline — contacts grouped by lead stage
  fastify.get("/pipeline", async (request) => {
    const orgId = orgScope(request);
    const rows = await prisma.contact.groupBy({
      by: ["leadStage"],
      where: { orgId, deletedAt: null },
      _count: { _all: true },
    });
    const ORDER = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
    return ORDER.map((stage) => ({
      stage,
      count: rows.find((r) => r.leadStage === stage)?._count._all ?? 0,
    }));
  });

  // GET /analytics/activities-by-type — activities in last 30 days by type
  fastify.get("/activities-by-type", async (request) => {
    const orgId = orgScope(request);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.activity.groupBy({
      by: ["type"],
      where: { orgId, createdAt: { gte: since } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ type: r.type, count: r._count._all }));
  });

  // GET /analytics/contacts-trend — new contacts per day for last 30 days
  fastify.get("/contacts-trend", async (request) => {
    const orgId = orgScope(request);
    // Use raw SQL for date-level grouping
    const rows = await prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
        CAST(COUNT(*) AS INTEGER) AS count
      FROM contacts
      WHERE org_id = ${orgId}
        AND deleted_at IS NULL
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  });

  // GET /analytics/rep-leaderboard — top reps by activity count (last 30 days)
  fastify.get("/rep-leaderboard", async (request) => {
    const orgId = orgScope(request);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.activity.groupBy({
      by: ["createdById"],
      where: { orgId, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { createdById: "desc" } },
      take: 10,
    });
    if (rows.length === 0) return [];

    const userIds = rows.map((r) => r.createdById);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
      userId: r.createdById,
      name: userMap[r.createdById]?.name ?? "Unknown",
      avatarUrl: userMap[r.createdById]?.avatarUrl ?? null,
      count: r._count._all,
    }));
  });

  // GET /analytics/lead-scores — distribution of lead scores in buckets of 10
  fastify.get("/lead-scores", async (request) => {
    const orgId = orgScope(request);
    const rows = await prisma.$queryRaw<{ bucket: number; count: number }[]>`
      SELECT
        FLOOR(lead_score / 10) * 10 AS bucket,
        CAST(COUNT(*) AS INTEGER) AS count
      FROM contacts
      WHERE org_id = ${orgId}
        AND deleted_at IS NULL
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
    return rows.map((r) => ({ bucket: Number(r.bucket), count: Number(r.count) }));
  });

  // GET /analytics/companies-by-industry — top 10 industries
  fastify.get("/companies-by-industry", async (request) => {
    const orgId = orgScope(request);
    const rows = await prisma.company.groupBy({
      by: ["industry"],
      where: { orgId, deletedAt: null, industry: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { industry: "desc" } },
      take: 10,
    });
    return rows
      .filter((r) => r.industry)
      .map((r) => ({ industry: r.industry!, count: r._count._all }));
  });
};
