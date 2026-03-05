import { FastifyPluginAsync } from "fastify";
import { requireRole, requireAuth, orgScope, JWTPayload } from "../plugins/auth";
import { prisma } from "@opensales/database";
import { hashPassword, generateInviteToken } from "../services/auth.service";

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/users
  fastify.get("/users", { preHandler: requireRole("ORG_ADMIN", "MANAGER") }, async (request) => {
    return prisma.user.findMany({
      where: { orgId: orgScope(request), deletedAt: null },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  });

  // POST /admin/invitations
  fastify.post("/invitations", { preHandler: requireRole("ORG_ADMIN") }, async (request, reply) => {
    const body = request.body as { email: string; role: string };
    const token = await generateInviteToken();
    const invitation = await prisma.invitation.create({
      data: {
        orgId: orgScope(request),
        email: body.email,
        role: body.role as never,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return reply.code(201).send({ invitation, inviteUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/accept-invite/${token}` });
  });

  // GET /admin/settings
  fastify.get("/settings", { preHandler: requireRole("ORG_ADMIN") }, async (request) => {
    const org = await prisma.organization.findUnique({
      where: { id: orgScope(request) },
      select: { id: true, name: true, slug: true, settings: true },
    });
    if (!org) return null;
    // Strip sensitive apiKeys from response
    const { apiKeys, ...publicSettings } = (org.settings as Record<string, any>) ?? {};
    return { ...org, settings: publicSettings };
  });

  // PATCH /admin/settings
  fastify.patch("/settings", { preHandler: requireRole("ORG_ADMIN") }, async (request) => {
    const body = request.body as { name?: string; settings?: Record<string, any>; apiKeys?: Record<string, string> };
    const orgId = orgScope(request);

    // Load existing settings for deep merge
    const existing = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
    const existingSettings = (existing?.settings as Record<string, any>) ?? {};

    // Merge incoming public settings on top of existing, then re-apply stored apiKeys
    const mergedSettings: Record<string, any> = {
      ...existingSettings,
      ...(body.settings ?? {}),
    };

    // Merge apiKeys if provided (store them but never expose in GET)
    if (body.apiKeys) {
      mergedSettings.apiKeys = {
        ...(existingSettings.apiKeys ?? {}),
        ...body.apiKeys,
      };
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { name: body.name, settings: mergedSettings },
      select: { id: true, name: true, slug: true, settings: true },
    });

    // Strip apiKeys from response
    const { apiKeys, ...publicSettings } = (org.settings as Record<string, any>) ?? {};
    return { ...org, settings: publicSettings };
  });

  // POST /admin/settings/test-integration
  fastify.post("/settings/test-integration", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.user as JWTPayload;
    const { provider, apiKey } = request.body as { provider: "apollo" | "hunter" | "clearbit"; apiKey: string };

    try {
      if (provider === "apollo") {
        const res = await fetch("https://api.apollo.io/v1/auth/health", {
          headers: { "Cache-Control": "no-cache", "Content-Type": "application/json", "X-Api-Key": apiKey },
        });
        if (!res.ok) return reply.code(400).send({ error: "Invalid Apollo API key" });
      } else if (provider === "hunter") {
        const res = await fetch(`https://api.hunter.io/v2/account?api_key=${apiKey}`);
        if (!res.ok) return reply.code(400).send({ error: "Invalid Hunter.io API key" });
      } else if (provider === "clearbit") {
        const res = await fetch("https://company.clearbit.com/v2/companies/find?domain=clearbit.com", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.status === 401) return reply.code(400).send({ error: "Invalid Clearbit API key" });
      }
      return { success: true, message: `${provider} connection verified` };
    } catch (e) {
      return reply.code(500).send({ error: "Connection test failed" });
    }
  });

  // GET /admin/analytics/dashboard
  fastify.get("/analytics/dashboard", { preHandler: requireRole("ORG_ADMIN", "MANAGER", "SALES_REP") }, async (request) => {
    const orgId = orgScope(request);
    const [totalContacts, totalCompanies, totalLists, activitiesThisWeek, tasksDue] = await Promise.all([
      prisma.contact.count({ where: { orgId, deletedAt: null } }),
      prisma.company.count({ where: { orgId, deletedAt: null } }),
      prisma.list.count({ where: { orgId } }),
      prisma.activity.count({
        where: { orgId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.activity.count({
        where: { orgId, type: "TASK", completedAt: null, dueAt: { lte: new Date() } },
      }),
    ]);
    return { totalContacts, totalCompanies, totalLists, activitiesThisWeek, tasksDue };
  });
};
