import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
import { prisma } from "@opensales/database";

export const savedSearchesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request) => {
    return prisma.savedSearch.findMany({
      where: { orgId: orgScope(request) },
      orderBy: { createdAt: "desc" },
    });
  });

  fastify.post("/", async (request, reply) => {
    const body = request.body as { name: string; entityType: string; filterConfig: object; alertEnabled?: boolean };
    const search = await prisma.savedSearch.create({
      data: {
        name: body.name,
        entityType: body.entityType,
        filterConfig: body.filterConfig,
        alertEnabled: body.alertEnabled ?? false,
        orgId: orgScope(request),
        ownerId: request.user.userId,
      },
    });
    return reply.code(201).send(search);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.savedSearch.delete({ where: { id } });
    return reply.code(204).send();
  });
};
