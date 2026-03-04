import { FastifyPluginAsync } from "fastify";
import { requireRole, orgScope } from "../plugins/auth";
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
    return prisma.organization.findUnique({
      where: { id: orgScope(request) },
      select: { id: true, name: true, slug: true, settings: true },
    });
  });

  // PATCH /admin/settings
  fastify.patch("/settings", { preHandler: requireRole("ORG_ADMIN") }, async (request) => {
    const body = request.body as { name?: string; settings?: object };
    return prisma.organization.update({
      where: { id: orgScope(request) },
      data: { name: body.name, settings: body.settings },
      select: { id: true, name: true, slug: true, settings: true },
    });
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
