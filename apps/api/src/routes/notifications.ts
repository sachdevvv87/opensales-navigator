import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
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
};
