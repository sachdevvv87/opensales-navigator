import { FastifyPluginAsync } from "fastify";
import { prisma } from "@opensales/database";
import { requireAuth, orgScope } from "../plugins/auth";

export const sequencesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  // GET /sequences
  fastify.get("/", async (request) => {
    const orgId = orgScope(request);
    const query = request.query as Record<string, string>;
    return prisma.emailSequence.findMany({
      where: {
        orgId,
        ...(query.status && { status: query.status as any }),
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        steps: { orderBy: { order: "asc" } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  // POST /sequences
  fastify.post("/", async (request, reply) => {
    const orgId = orgScope(request);
    const { userId } = request.user;
    const { name, description, steps } = request.body as {
      name: string;
      description?: string;
      steps?: Array<{ subject: string; body: string; delayDays: number; order: number }>;
    };
    if (!name) return reply.code(400).send({ error: "name is required" });

    const sequence = await prisma.emailSequence.create({
      data: {
        orgId,
        name,
        description,
        createdById: userId,
        steps: steps
          ? {
              create: steps.map((s, i) => ({
                order: s.order ?? i + 1,
                subject: s.subject,
                body: s.body,
                delayDays: s.delayDays ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        steps: { orderBy: { order: "asc" } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    });
    return reply.code(201).send(sequence);
  });

  // GET /sequences/:id
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const sequence = await prisma.emailSequence.findFirst({
      where: { id, orgId },
      include: {
        steps: { orderBy: { order: "asc" } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        enrollments: {
          take: 50,
          orderBy: { startedAt: "desc" },
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!sequence) return reply.code(404).send({ error: "Sequence not found" });
    return sequence;
  });

  // PATCH /sequences/:id
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const existing = await prisma.emailSequence.findFirst({ where: { id, orgId } });
    if (!existing) return reply.code(404).send({ error: "Sequence not found" });

    const { name, description, status, steps } = request.body as {
      name?: string;
      description?: string;
      status?: string;
      steps?: Array<{ id?: string; subject: string; body: string; delayDays: number; order: number }>;
    };

    // If steps provided, replace all steps
    if (steps !== undefined) {
      await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } });
    }

    return prisma.emailSequence.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status: status as any }),
        ...(steps !== undefined && {
          steps: {
            create: steps.map((s, i) => ({
              order: s.order ?? i + 1,
              subject: s.subject,
              body: s.body,
              delayDays: s.delayDays ?? 0,
            })),
          },
        }),
      },
      include: {
        steps: { orderBy: { order: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });
  });

  // DELETE /sequences/:id
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const existing = await prisma.emailSequence.findFirst({ where: { id, orgId } });
    if (!existing) return reply.code(404).send({ error: "Sequence not found" });
    await prisma.emailSequence.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /sequences/:id/enroll — enroll contacts in a sequence
  fastify.post("/:id/enroll", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const { contactIds } = request.body as { contactIds: string[] };
    if (!Array.isArray(contactIds) || contactIds.length === 0)
      return reply.code(400).send({ error: "contactIds array is required" });

    const sequence = await prisma.emailSequence.findFirst({ where: { id, orgId } });
    if (!sequence) return reply.code(404).send({ error: "Sequence not found" });
    if (sequence.status !== "ACTIVE")
      return reply.code(409).send({ error: "Sequence must be ACTIVE to enroll contacts" });

    const firstStep = await prisma.sequenceStep.findFirst({
      where: { sequenceId: id },
      orderBy: { order: "asc" },
    });

    const results = await Promise.allSettled(
      contactIds.map((contactId) =>
        prisma.sequenceEnrollment.upsert({
          where: { sequenceId_contactId: { sequenceId: id, contactId } },
          create: {
            sequenceId: id,
            contactId,
            status: "ACTIVE",
            currentStep: 0,
            nextSendAt: firstStep
              ? new Date(Date.now() + firstStep.delayDays * 86_400_000)
              : null,
          },
          update: {
            status: "ACTIVE",
            currentStep: 0,
            completedAt: null,
            nextSendAt: firstStep
              ? new Date(Date.now() + firstStep.delayDays * 86_400_000)
              : null,
          },
        })
      )
    );

    const enrolled = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    return { enrolled, failed };
  });

  // PATCH /sequences/:id/enrollments/:enrollmentId — update enrollment status
  fastify.patch("/:id/enrollments/:enrollmentId", async (request, reply) => {
    const { id, enrollmentId } = request.params as { id: string; enrollmentId: string };
    const orgId = orgScope(request);
    const sequence = await prisma.emailSequence.findFirst({ where: { id, orgId } });
    if (!sequence) return reply.code(404).send({ error: "Sequence not found" });

    const { status } = request.body as { status: string };
    return prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: status as any,
        ...(["COMPLETED", "REPLIED", "UNSUBSCRIBED", "BOUNCED"].includes(status) && {
          completedAt: new Date(),
        }),
      },
    });
  });

  // GET /sequences/:id/enrollments
  fastify.get("/:id/enrollments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = orgScope(request);
    const sequence = await prisma.emailSequence.findFirst({ where: { id, orgId } });
    if (!sequence) return reply.code(404).send({ error: "Sequence not found" });

    const query = request.query as Record<string, string>;
    return prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId: id,
        ...(query.status && { status: query.status as any }),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  });
};
