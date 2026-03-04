import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
import { ActivityCreateSchema, ActivityUpdateSchema, PaginationSchema } from "@opensales/shared";
import { prisma } from "@opensales/database";

export const activitiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request) => {
    const query = request.query as Record<string, string>;
    const pagination = PaginationSchema.parse({ page: query.page, limit: query.limit });
    const orgId = orgScope(request);
    const where: Record<string, unknown> = { orgId };
    if (query.entityType) where.entityType = query.entityType;
    if (query.contactId) where.contactId = query.contactId;
    if (query.companyId) where.companyId = query.companyId;
    if (query.type) where.type = query.type;
    if (query.overdue === "true") where.dueAt = { lte: new Date() };

    const [data, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.activity.count({ where }),
    ]);
    return { data, pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) } };
  });

  fastify.post("/", async (request, reply) => {
    const body = ActivityCreateSchema.parse(request.body);
    const activity = await prisma.activity.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...body, orgId: orgScope(request), createdById: request.user.userId } as any,
    });
    return reply.code(201).send(activity);
  });

  fastify.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const body = ActivityUpdateSchema.parse(request.body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.activity.update({ where: { id }, data: body as any });
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.activity.delete({ where: { id } });
    return reply.code(204).send();
  });
};
