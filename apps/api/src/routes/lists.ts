import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
import { ListCreateSchema, ListUpdateSchema, AddToListSchema, PaginationSchema } from "@opensales/shared";
import { prisma } from "@opensales/database";
import { evaluateSmartList } from "../services/smart-list.service";

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
    if ((body as any).type === "SMART" && (body as any).filterConfig) {
      await evaluateSmartList(list.id, orgScope(request));
    }
    return reply.code(201).send(list);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const listCheck = await prisma.list.findFirst({ where: { id, orgId } });
    if (!listCheck) return reply.code(404).send({ error: "List not found" });
    if (listCheck.type === "SMART" && listCheck.filterConfig) {
      await evaluateSmartList(listCheck.id, orgId);
    }
    const list = await prisma.list.findFirst({
      where: { id, orgId },
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
    const orgId = orgScope(request);
    const body = ListUpdateSchema.parse(request.body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = await prisma.list.update({ where: { id }, data: body as any });
    if (list.type === "SMART") {
      await evaluateSmartList(id, orgId);
    }
    return list;
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.list.delete({ where: { id } });
    return reply.code(204).send();
  });

  fastify.post("/:id/refresh", { preHandler: [requireAuth] }, async (request, reply) => {
    const orgId = orgScope(request);
    const { id } = request.params as { id: string };
    const list = await prisma.list.findUnique({ where: { id, orgId } });
    if (!list) return reply.code(404).send({ error: "List not found" });
    if (list.type !== "SMART") return reply.code(400).send({ error: "Only SMART lists can be refreshed" });
    const count = await evaluateSmartList(id, orgId);
    return { count, message: `List refreshed with ${count} contacts` };
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
