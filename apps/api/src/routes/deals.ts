import { FastifyPluginAsync } from "fastify";
import { prisma } from "@opensales/database";
import { requireAuth, orgScope } from "../plugins/auth";

function adminOnly(role: string, reply: any) {
  if (!["ORG_ADMIN", "MANAGER"].includes(role)) {
    reply.code(403).send({ error: "Forbidden", message: "Admin or Manager required" });
    return true;
  }
  return false;
}

export const dealsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  // ── Deal Stages ────────────────────────────────────────────────────────────

  // GET /deals/stages
  fastify.get("/stages", async (request) => {
    const orgId = orgScope(request);
    return prisma.dealStage.findMany({
      where: { orgId },
      orderBy: { order: "asc" },
    });
  });

  // POST /deals/stages
  fastify.post("/stages", async (request, reply) => {
    if (adminOnly(request.user.role, reply)) return;
    const orgId = orgScope(request);
    const { name, color, order, isClosed, isWon } = request.body as {
      name: string;
      color?: string;
      order?: number;
      isClosed?: boolean;
      isWon?: boolean;
    };
    if (!name) return reply.code(400).send({ error: "name is required" });
    const maxOrder = await prisma.dealStage.aggregate({
      where: { orgId },
      _max: { order: true },
    });
    const stage = await prisma.dealStage.create({
      data: {
        orgId,
        name,
        color: color ?? "#6366f1",
        order: order ?? (maxOrder._max.order ?? 0) + 1,
        isClosed: isClosed ?? false,
        isWon: isWon ?? false,
      },
    });
    return reply.code(201).send(stage);
  });

  // PATCH /deals/stages/:id
  fastify.patch("/stages/:id", async (request, reply) => {
    if (adminOnly(request.user.role, reply)) return;
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const existing = await prisma.dealStage.findFirst({ where: { id, orgId } });
    if (!existing) return reply.code(404).send({ error: "Stage not found" });
    const { name, color, order, isClosed, isWon } = request.body as Record<string, unknown>;
    return prisma.dealStage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name as string }),
        ...(color !== undefined && { color: color as string }),
        ...(order !== undefined && { order: order as number }),
        ...(isClosed !== undefined && { isClosed: isClosed as boolean }),
        ...(isWon !== undefined && { isWon: isWon as boolean }),
      },
    });
  });

  // DELETE /deals/stages/:id
  fastify.delete("/stages/:id", async (request, reply) => {
    if (adminOnly(request.user.role, reply)) return;
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const existing = await prisma.dealStage.findFirst({ where: { id, orgId } });
    if (!existing) return reply.code(404).send({ error: "Stage not found" });
    const dealCount = await prisma.deal.count({ where: { stageId: id, deletedAt: null } });
    if (dealCount > 0)
      return reply.code(409).send({ error: "Cannot delete a stage that contains deals" });
    await prisma.dealStage.delete({ where: { id } });
    return reply.code(204).send();
  });

  // ── Deals ──────────────────────────────────────────────────────────────────

  // GET /deals
  fastify.get("/", async (request) => {
    const orgId = orgScope(request);
    const query = request.query as Record<string, string>;
    const where: Record<string, unknown> = { orgId, deletedAt: null };
    if (query.stageId) where.stageId = query.stageId;
    if (query.status) where.status = query.status;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.contactId) where.contactId = query.contactId;
    if (query.companyId) where.companyId = query.companyId;

    return prisma.deal.findMany({
      where,
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: [{ stage: { order: "asc" } }, { createdAt: "desc" }],
    });
  });

  // POST /deals
  fastify.post("/", async (request, reply) => {
    const orgId = orgScope(request);
    const { userId } = request.user;
    const { name, value, currency, stageId, probability, closeDate, contactId, companyId, ownerId, notes } =
      request.body as {
        name: string;
        value?: number;
        currency?: string;
        stageId: string;
        probability?: number;
        closeDate?: string;
        contactId?: string;
        companyId?: string;
        ownerId?: string;
        notes?: string;
      };
    if (!name || !stageId) return reply.code(400).send({ error: "name and stageId are required" });

    const stage = await prisma.dealStage.findFirst({ where: { id: stageId, orgId } });
    if (!stage) return reply.code(404).send({ error: "Stage not found" });

    const deal = await prisma.deal.create({
      data: {
        orgId,
        name,
        value,
        currency: currency ?? "USD",
        stageId,
        probability,
        closeDate: closeDate ? new Date(closeDate) : null,
        contactId: contactId ?? null,
        companyId: companyId ?? null,
        ownerId: ownerId ?? userId,
        notes,
      },
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    return reply.code(201).send(deal);
  });

  // GET /deals/:id
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const deal = await prisma.deal.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, title: true } },
        company: { select: { id: true, name: true, logoUrl: true, domain: true } },
        owner: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });
    if (!deal) return reply.code(404).send({ error: "Deal not found" });
    return deal;
  });

  // PATCH /deals/:id
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const existing = await prisma.deal.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!existing) return reply.code(404).send({ error: "Deal not found" });

    const { name, value, currency, stageId, status, probability, closeDate, contactId, companyId, ownerId, notes } =
      request.body as Record<string, unknown>;

    if (stageId) {
      const stage = await prisma.dealStage.findFirst({ where: { id: stageId as string, orgId } });
      if (!stage) return reply.code(404).send({ error: "Stage not found" });
    }

    return prisma.deal.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name as string }),
        ...(value !== undefined && { value: value as number }),
        ...(currency !== undefined && { currency: currency as string }),
        ...(stageId !== undefined && { stageId: stageId as string }),
        ...(status !== undefined && { status: status as "OPEN" | "WON" | "LOST" }),
        ...(probability !== undefined && { probability: probability as number }),
        ...(closeDate !== undefined && { closeDate: closeDate ? new Date(closeDate as string) : null }),
        ...(contactId !== undefined && { contactId: contactId as string | null }),
        ...(companyId !== undefined && { companyId: companyId as string | null }),
        ...(ownerId !== undefined && { ownerId: ownerId as string }),
        ...(notes !== undefined && { notes: notes as string }),
      },
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  });

  // DELETE /deals/:id
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const existing = await prisma.deal.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!existing) return reply.code(404).send({ error: "Deal not found" });
    await prisma.deal.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.code(204).send();
  });

  // PATCH /deals/:id/move — move to a different stage
  fastify.patch("/:id/move", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const { stageId } = request.body as { stageId: string };
    if (!stageId) return reply.code(400).send({ error: "stageId is required" });

    const [deal, stage] = await Promise.all([
      prisma.deal.findFirst({ where: { id, orgId, deletedAt: null } }),
      prisma.dealStage.findFirst({ where: { id: stageId, orgId } }),
    ]);
    if (!deal) return reply.code(404).send({ error: "Deal not found" });
    if (!stage) return reply.code(404).send({ error: "Stage not found" });

    return prisma.deal.update({
      where: { id },
      data: {
        stageId,
        status: stage.isWon ? "WON" : stage.isClosed ? "LOST" : "OPEN",
      },
      include: { stage: true },
    });
  });
};
