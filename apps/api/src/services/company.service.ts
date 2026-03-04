import { prisma } from "@opensales/database";
import { CompanyCreateInput, CompanyUpdateInput, CompanyFilterInput, PaginationInput } from "@opensales/shared";

export async function listCompanies(
  orgId: string,
  filters: CompanyFilterInput,
  pagination: PaginationInput
) {
  const where: Record<string, unknown> = { orgId, deletedAt: null };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { domain: { contains: filters.search, mode: "insensitive" } },
      { industry: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.industry?.length) where.industry = { in: filters.industry };
  if (filters.companyType?.length) where.companyType = { in: filters.companyType };
  if (filters.accountTier?.length) where.accountTier = { in: filters.accountTier };
  if (filters.fundingStage?.length) where.fundingStage = { in: filters.fundingStage };
  if (filters.hqCountry?.length) where.hqCountry = { in: filters.hqCountry };
  if (filters.accountOwnerId?.length) where.accountOwnerId = { in: filters.accountOwnerId };
  if (filters.employeeCountMin != null) where.employeeCount = { gte: filters.employeeCountMin };
  if (filters.employeeCountMax != null) {
    where.employeeCount = { ...((where.employeeCount as object) ?? {}), lte: filters.employeeCountMax };
  }

  const skip = (pagination.page - 1) * pagination.limit;
  const [data, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: pagination.limit,
      orderBy: { [pagination.sortBy ?? "createdAt"]: pagination.sortOrder ?? "desc" },
      include: {
        accountOwner: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { contacts: true } },
      },
    }),
    prisma.company.count({ where }),
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

export async function getCompany(id: string, orgId: string) {
  return prisma.company.findFirst({
    where: { id, orgId, deletedAt: null },
    include: {
      accountOwner: { select: { id: true, name: true, avatarUrl: true } },
      contacts: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: "desc" } },
      _count: { select: { contacts: true } },
    },
  });
}

export async function createCompany(orgId: string, createdById: string, data: CompanyCreateInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.company.create({ data: { ...data, orgId, createdBy: createdById } as any });
}

export async function updateCompany(id: string, orgId: string, data: CompanyUpdateInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.company.update({ where: { id }, data: data as any });
}

export async function deleteCompany(id: string, orgId: string) {
  return prisma.company.update({ where: { id }, data: { deletedAt: new Date() } });
}
