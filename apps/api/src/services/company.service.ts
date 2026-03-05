import { prisma, Prisma } from "@opensales/database";
import { CompanyCreateInput, CompanyUpdateInput, CompanyFilterInput, PaginationInput } from "@opensales/shared";

export async function listCompanies(
  orgId: string,
  filters: CompanyFilterInput,
  pagination: PaginationInput
) {
  const where: Prisma.CompanyWhereInput = {
    orgId,
    deletedAt: null,
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { domain: { contains: filters.search, mode: "insensitive" } },
        { industry: { contains: filters.search, mode: "insensitive" } },
      ],
    }),
    ...(filters.industry?.length && { industry: { in: filters.industry } }),
    ...(filters.companyType?.length && { companyType: { in: filters.companyType as any } }),
    ...(filters.accountTier?.length && { accountTier: { in: filters.accountTier as any } }),
    ...(filters.fundingStage?.length && { fundingStage: { in: filters.fundingStage as any } }),
    ...(filters.hqCountry?.length && { hqCountry: { in: filters.hqCountry } }),
    ...(filters.employeeCountMin !== undefined && { employeeCount: { gte: filters.employeeCountMin } }),
    ...(filters.employeeCountMax !== undefined && {
      employeeCount: filters.employeeCountMin !== undefined
        ? { gte: filters.employeeCountMin, lte: filters.employeeCountMax }
        : { lte: filters.employeeCountMax },
    }),
    ...(filters.accountOwnerId?.length && { accountOwnerId: { in: filters.accountOwnerId } }),
  };

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
