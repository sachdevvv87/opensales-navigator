import { prisma, Prisma } from "@opensales/database";

export async function evaluateSmartList(listId: string, orgId: string): Promise<number> {
  const list = await prisma.list.findUnique({ where: { id: listId, orgId } });
  if (!list || list.type !== "SMART" || !list.filterConfig) return 0;

  const config = list.filterConfig as Record<string, any>;

  const where: Prisma.ContactWhereInput = {
    orgId,
    deletedAt: null,
    ...(config.search && {
      OR: [
        { firstName: { contains: config.search, mode: "insensitive" } },
        { lastName: { contains: config.search, mode: "insensitive" } },
        { email: { contains: config.search, mode: "insensitive" } },
        { title: { contains: config.search, mode: "insensitive" } },
      ],
    }),
    ...(config.leadStage?.length && { leadStage: { in: config.leadStage } }),
    ...(config.seniority?.length && { seniority: { in: config.seniority } }),
    ...(config.department?.length && { department: { in: config.department } }),
    ...(config.assignedToId?.length && { assignedToId: { in: config.assignedToId } }),
    ...(config.companyId?.length && { companyId: { in: config.companyId } }),
    ...(config.tags?.length && { tags: { hasSome: config.tags } }),
    ...(config.locationCountry?.length && { locationCountry: { in: config.locationCountry } }),
    ...(config.leadScoreMin !== undefined && { leadScore: { gte: config.leadScoreMin } }),
    ...(config.leadScoreMax !== undefined && { leadScore: { lte: config.leadScoreMax } }),
    ...(config.hasEmail === true && { email: { not: null } }),
    ...(config.hasPhone === true && { phones: { some: {} } }),
    ...(config.hasPhone === false && { phones: { none: {} } }),
    ...(config.createdAfter && { createdAt: { gte: new Date(config.createdAfter) } }),
    ...(config.createdBefore && { createdAt: { lte: new Date(config.createdBefore) } }),
  };

  const matchingContacts = await prisma.contact.findMany({ where, select: { id: true } });

  // Clear existing SMART list members and repopulate
  await prisma.listMemberContact.deleteMany({ where: { listId } });

  if (matchingContacts.length > 0) {
    await prisma.listMemberContact.createMany({
      data: matchingContacts.map((c) => ({
        listId,
        contactId: c.id,
        addedBy: list.ownerId,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.list.update({ where: { id: listId }, data: { updatedAt: new Date() } });

  return matchingContacts.length;
}
