import { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../plugins/auth";
import { JWTPayload } from "../plugins/auth";
import { prisma } from "@opensales/database";
import {
  apolloProspect,
  apolloEnrichContact,
  hunterFindEmail,
  clearbitEnrichCompany,
  getOrgApiKeys,
  IcpConfig,
} from "../services/enrichment.service";

export const enrichmentRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /enrichment/prospect — Apollo ICP search
  fastify.post("/prospect", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.user as JWTPayload;
    const { icp, page = 1 } = request.body as { icp?: IcpConfig; page?: number };

    const keys = await getOrgApiKeys(orgId);
    if (!keys.apollo) return reply.code(400).send({ error: "Apollo API key not configured. Go to Settings → Integrations to add it." });

    // Use org ICP if not provided in request
    let icpConfig = icp;
    if (!icpConfig) {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
      icpConfig = ((org?.settings as any)?.icp ?? {}) as IcpConfig;
    }

    const { results, total } = await apolloProspect(icpConfig, keys.apollo, page);

    // Check which prospects already exist in the org
    const emails = results.map((r) => r.email).filter(Boolean) as string[];
    const existing = emails.length
      ? await prisma.contact.findMany({ where: { orgId, email: { in: emails }, deletedAt: null }, select: { email: true } })
      : [];
    const existingEmails = new Set(existing.map((e) => e.email));

    return {
      results: results.map((r) => ({ ...r, alreadyInCrm: r.email ? existingEmails.has(r.email) : false })),
      total,
      page,
    };
  });

  // POST /enrichment/contacts/bulk-import — import selected prospects
  fastify.post("/contacts/bulk-import", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId, userId } = request.user as JWTPayload;
    const { prospects } = request.body as {
      prospects: Array<{
        firstName: string;
        lastName: string;
        email?: string;
        title?: string;
        linkedinUrl?: string;
        companyName?: string;
        companyDomain?: string;
        locationCity?: string;
        locationCountry?: string;
        seniority?: string;
        department?: string;
        avatarUrl?: string;
      }>;
    };

    let created = 0;
    let skipped = 0;

    for (const p of prospects) {
      if (p.email) {
        const exists = await prisma.contact.findFirst({ where: { orgId, email: p.email, deletedAt: null } });
        if (exists) {
          skipped++;
          continue;
        }
      }

      await prisma.contact.create({
        data: {
          orgId,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email ?? null,
          title: p.title ?? null,
          linkedinUrl: p.linkedinUrl ?? null,
          locationCity: p.locationCity ?? null,
          locationCountry: p.locationCountry ?? null,
          seniority: (p.seniority as any) ?? null,
          department: p.department ?? null,
          avatarUrl: p.avatarUrl ?? null,
          source: "apollo_prospect",
          tags: ["prospect"],
          createdById: userId,
        } as any,
      });
      created++;
    }

    return { created, skipped, total: prospects.length };
  });

  // POST /enrichment/contacts/:id — enrich single contact with Apollo
  fastify.post("/contacts/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.user as JWTPayload;
    const { id } = request.params as { id: string };

    const contact = await prisma.contact.findUnique({ where: { id, orgId } });
    if (!contact) return reply.code(404).send({ error: "Contact not found" });

    const keys = await getOrgApiKeys(orgId);
    if (!keys.apollo) return reply.code(400).send({ error: "Apollo API key not configured" });

    const enriched = await apolloEnrichContact(
      {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? undefined,
        companyName: undefined,
      },
      keys.apollo
    );

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(enriched.email && !contact.email ? { email: enriched.email } : {}),
        ...(enriched.title && !contact.title ? { title: enriched.title } : {}),
        ...(enriched.linkedinUrl && !contact.linkedinUrl ? { linkedinUrl: enriched.linkedinUrl } : {}),
        ...(enriched.locationCity && !contact.locationCity ? { locationCity: enriched.locationCity } : {}),
        ...(enriched.locationCountry && !contact.locationCountry ? { locationCountry: enriched.locationCountry } : {}),
        ...(enriched.seniority && !contact.seniority ? { seniority: enriched.seniority as any } : {}),
        ...(enriched.department && !contact.department ? { department: enriched.department } : {}),
        ...(enriched.avatarUrl && !contact.avatarUrl ? { avatarUrl: enriched.avatarUrl } : {}),
        enrichmentData: { ...((contact.enrichmentData as any) ?? {}), apollo: enriched },
        lastEnrichedAt: new Date(),
      } as any,
    });

    return updated;
  });

  // POST /enrichment/find-email — Hunter email finder
  fastify.post("/find-email", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.user as JWTPayload;
    const { firstName, lastName, domain } = request.body as { firstName: string; lastName: string; domain: string };

    const keys = await getOrgApiKeys(orgId);
    if (!keys.hunter) return reply.code(400).send({ error: "Hunter.io API key not configured" });

    const email = await hunterFindEmail(firstName, lastName, domain, keys.hunter);
    return { email };
  });

  // POST /enrichment/companies/:id — Clearbit company enrichment
  fastify.post("/companies/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.user as JWTPayload;
    const { id } = request.params as { id: string };

    const company = await prisma.company.findUnique({ where: { id, orgId } });
    if (!company) return reply.code(404).send({ error: "Company not found" });
    if (!company.domain) return reply.code(400).send({ error: "Company has no domain set" });

    const keys = await getOrgApiKeys(orgId);
    if (!keys.clearbit) return reply.code(400).send({ error: "Clearbit API key not configured" });

    const enriched = await clearbitEnrichCompany(company.domain, keys.clearbit);

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(enriched.description && !company.description && { description: enriched.description }),
        ...(enriched.industry && !company.industry && { industry: enriched.industry }),
        ...(enriched.employeeCount && !company.employeeCount && { employeeCount: enriched.employeeCount }),
        ...(enriched.logoUrl && !company.logoUrl && { logoUrl: enriched.logoUrl }),
        ...(enriched.website && !company.website && { website: enriched.website }),
        ...(enriched.foundedYear && !company.foundedYear && { foundedYear: enriched.foundedYear }),
        ...(enriched.hqCity && !company.hqCity && { hqCity: enriched.hqCity }),
        ...(enriched.hqCountry && !company.hqCountry && { hqCountry: enriched.hqCountry }),
        ...(enriched.techStack?.length && { techStack: enriched.techStack }),
        enrichmentData: { ...((company.enrichmentData as any) ?? {}), clearbit: enriched },
        lastEnrichedAt: new Date(),
      } as any,
    });

    return updated;
  });

  // GET /enrichment/status — check which integrations are configured
  fastify.get("/status", { preHandler: [requireAuth] }, async (request) => {
    const { orgId } = request.user as JWTPayload;
    const keys = await getOrgApiKeys(orgId);
    return {
      apollo: !!keys.apollo,
      hunter: !!keys.hunter,
      clearbit: !!keys.clearbit,
    };
  });
};
