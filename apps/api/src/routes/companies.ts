import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
import { listCompanies, getCompany, createCompany, updateCompany, deleteCompany } from "../services/company.service";
import { CompanyCreateSchema, CompanyUpdateSchema, CompanyFilterSchema, PaginationSchema } from "@opensales/shared";

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
};
