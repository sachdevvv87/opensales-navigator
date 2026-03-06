import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
import { listCompanies, getCompany, createCompany, updateCompany, deleteCompany } from "../services/company.service";
import { CompanyCreateSchema, CompanyUpdateSchema, CompanyFilterSchema, PaginationSchema } from "@opensales/shared";
import { prisma } from "@opensales/database";

export const companiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request) => {
    const query = request.query as Record<string, string>;
    const filters = CompanyFilterSchema.parse({ search: query.search });
    const pagination = PaginationSchema.parse({ page: query.page, limit: query.limit });
    return listCompanies(orgScope(request), filters, pagination);
  });

  fastify.post("/", async (request, reply) => {
    const body = CompanyCreateSchema.parse(request.body);
    const company = await createCompany(orgScope(request), request.user.userId, body);
    return reply.code(201).send(company);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const company = await getCompany(id, orgScope(request));
    if (!company) return reply.code(404).send({ error: "Company not found" });
    return company;
  });

  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CompanyUpdateSchema.parse(request.body);
    return updateCompany(id, orgScope(request), body);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteCompany(id, orgScope(request));
    return reply.code(204).send();
  });

  // GET /companies/export — CSV download of all companies
  fastify.get("/export", async (request, reply) => {
    const orgId = orgScope(request);
    const companies = await prisma.company.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: "asc" },
      take: 10000,
    });

    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const headers = ["name", "domain", "website", "industry", "employeeCount", "hqCity", "hqCountry", "fundingStage", "companyType", "accountTier", "healthScore"];
    const rows = companies.map((c: (typeof companies)[0]) => [c.name, c.domain, c.website, c.industry, c.employeeCount, c.hqCity, c.hqCountry, c.fundingStage, c.companyType, c.accountTier, c.healthScore].map(escape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=\"companies.csv\"");
    return reply.send(csv);
  });
};
