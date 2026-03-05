import { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole, orgScope } from "../plugins/auth";
import { prisma } from "@opensales/database";

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request) => {
    const { unreadOnly } = request.query as { unreadOnly?: string };
    return prisma.notification.findMany({
      where: {
        orgId: orgScope(request),
        userId: request.user.userId,
        ...(unreadOnly === "true" ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  fastify.patch("/mark-read", async (request) => {
    const { ids } = request.body as { ids?: string[] };
    const userId = request.user.userId;
    if (ids?.length) {
      await prisma.notification.updateMany({ where: { id: { in: ids }, userId }, data: { readAt: new Date() } });
    } else {
      await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    }
    return { message: "Marked as read" };
  });

  // GET /notifications/settings — fetch org alert channel settings (smtp, slack, webhook)
  fastify.get("/settings", { preHandler: requireRole("ORG_ADMIN", "MANAGER") }, async (request) => {
    const orgId = orgScope(request);
    const org = await (prisma.organization as any).findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    return {
      smtp: settings.smtp ?? null,
      slack: settings.slack ?? null,
      webhook: settings.webhook ?? null,
    };
  });

  // PATCH /notifications/settings — update org alert channel settings
  fastify.patch("/settings", { preHandler: requireRole("ORG_ADMIN", "MANAGER") }, async (request) => {
    const orgId = orgScope(request);
    const { smtp, slack, webhook } = request.body as {
      smtp?: { host: string; port?: number; secure?: boolean; user: string; password: string; from?: string } | null;
      slack?: string | null;
      webhook?: string | null;
    };

    const org = await (prisma.organization as any).findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const current = (org?.settings ?? {}) as Record<string, unknown>;

    const updated = {
      ...current,
      ...(smtp !== undefined ? { smtp } : {}),
      ...(slack !== undefined ? { slack } : {}),
      ...(webhook !== undefined ? { webhook } : {}),
    };

    await (prisma.organization as any).update({
      where: { id: orgId },
      data: { settings: updated },
    });

    return { smtp: updated.smtp ?? null, slack: updated.slack ?? null, webhook: updated.webhook ?? null };
  });
};
