import { prisma } from "@opensales/database";
import { ContactCreateInput, ContactUpdateInput, ContactFilterInput, PaginationInput } from "@opensales/shared";

export async function listContacts(
  orgId: string,
  filters: ContactFilterInput,
  pagination: PaginationInput
) {
  const where: Record<string, unknown> = {
    orgId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.leadStage?.length) where.leadStage = { in: filters.leadStage };
  if (filters.seniority?.length) where.seniority = { in: filters.seniority };
  if (filters.assignedToId?.length) where.assignedToId = { in: filters.assignedToId };
  if (filters.companyId?.length) where.companyId = { in: filters.companyId };
  if (filters.tags?.length) where.tags = { hasSome: filters.tags };
  if (filters.locationCountry?.length) where.locationCountry = { in: filters.locationCountry };
  if (filters.hasEmail === true) where.email = { not: null };
  if (filters.hasEmail === false) where.email = null;
  // leadScore range
  if (filters.leadScoreMin !== undefined && filters.leadScoreMax !== undefined) {
    where.leadScore = { gte: filters.leadScoreMin, lte: filters.leadScoreMax };
  } else if (filters.leadScoreMin !== undefined) {
    where.leadScore = { gte: filters.leadScoreMin };
  } else if (filters.leadScoreMax !== undefined) {
    where.leadScore = { lte: filters.leadScoreMax };
  }
  // hasPhone
  if (filters.hasPhone === true) where.phones = { some: {} };
  if (filters.hasPhone === false) where.phones = { none: {} };
  // department
  if (filters.department?.length) where.department = { in: filters.department };
  // createdAt range
  if (filters.createdAfter) where.createdAt = { gte: new Date(filters.createdAfter) };
  if (filters.createdBefore) {
    where.createdAt = { ...((where.createdAt as object) ?? {}), lte: new Date(filters.createdBefore) };
  }
  // listId
  if (filters.listId) where.listMembers = { some: { listId: filters.listId } };

  const skip = (pagination.page - 1) * pagination.limit;
  const sortField = pagination.sortBy ?? "createdAt";
  const sortOrder = pagination.sortOrder ?? "desc";

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: pagination.limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        company: { select: { id: true, name: true, logoUrl: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: pagination.page < Math.ceil(total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
  };
}

export async function getContact(id: string, orgId: string) {
  return prisma.contact.findFirst({
    where: { id, orgId, deletedAt: null },
    include: {
      company: true,
      assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      emails: true,
      phones: true,
    },
  });
}

export async function createContact(orgId: string, createdById: string, data: ContactCreateInput) {
  return prisma.contact.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { ...data, orgId, createdById, tags: data.tags ?? [] } as any,
  });
}

export async function updateContact(id: string, orgId: string, data: ContactUpdateInput) {
  return prisma.contact.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { ...data, updatedAt: new Date() } as any,
  });
}

export async function deleteContact(id: string, orgId: string) {
  return prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function bulkDeleteContacts(ids: string[], orgId: string) {
  return prisma.contact.updateMany({
    where: { id: { in: ids }, orgId },
    data: { deletedAt: new Date() },
  });
}
