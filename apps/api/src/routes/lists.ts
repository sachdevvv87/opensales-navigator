import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
import { ListCreateSchema, ListUpdateSchema, AddToListSchema, PaginationSchema } from "@opensales/shared";
import { prisma } from "@opensales/database";

export const listsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request) => {
    const query = request.query as Record<string, string>;
    const pagination = PaginationSchema.parse({ page: query.page, limit: query.limit });
    const orgId = orgScope(request);
    const [data, total] = await Promise.all([
      prisma.list.findMany({
        where: { orgId },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { contactMembers: true, companyMembers: true } } },
      }),
      prisma.list.count({ where: { orgId } }),
    ]);
    return { data, pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) } };
  });

  fastify.post("/", async (request, reply) => {
    const body = ListCreateSchema.parse(request.body);
    const list = await prisma.list.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...body, orgId: orgScope(request), ownerId: request.user.userId } as any,
    });
    return reply.code(201).send(list);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const list = await prisma.list.findFirst({
      where: { id, orgId: orgScope(request) },
      include: {
        contactMembers: { include: { contact: { select: { id: true, firstName: true, lastName: true, email: true, title: true } } } },
        _count: { select: { contactMembers: true, companyMembers: true } },
      },
    });
    if (!list) return reply.code(404).send({ error: "List not found" });
    return list;
  });

  fastify.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const body = ListUpdateSchema.parse(request.body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.list.update({ where: { id }, data: body as any });
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.list.delete({ where: { id } });
    return reply.code(204).send();
  });

  fastify.post("/:id/members", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = AddToListSchema.parse(request.body);
    if (body.entityType === "CONTACT") {
      await prisma.listMemberContact.createMany({
        data: body.entityIds.map((contactId) => ({ listId: id, contactId, addedBy: request.user.userId })),
        skipDuplicates: true,
      });
    } else {
      await prisma.listMemberCompany.createMany({
        data: body.entityIds.map((companyId) => ({ listId: id, companyId, addedBy: request.user.userId })),
        skipDuplicates: true,
      });
    }
    return reply.code(201).send({ added: body.entityIds.length });
  });
};
