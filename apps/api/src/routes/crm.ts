import { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole, orgScope, JWTPayload } from "../plugins/auth";
import { prisma } from "@opensales/database";
import {
  getHubSpotAuthUrl,
  exchangeHubSpotCode,
  getValidHubSpotToken,
  pushContactToHubSpot,
  pushCompanyToHubSpot,
} from "../services/crm.service";

const getRedirectUri = () =>
  `${process.env.APP_URL ?? "http://localhost:4000"}/api/v1/crm/hubspot/oauth/callback`;

export const crmRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /crm/connections
  fastify.get("/connections", { preHandler: requireRole("ORG_ADMIN", "MANAGER") }, async (request) => {
    const orgId = orgScope(request);
    const connections = await (prisma.crmConnection as any).findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    // Strip credentials from response
    return connections.map(({ credentialsJson: _c, ...safe }: any) => safe);
  });

  // GET /crm/hubspot/oauth/url
  fastify.get("/hubspot/oauth/url", { preHandler: requireAuth }, async () => {
    return { url: getHubSpotAuthUrl(getRedirectUri()) };
  });

  // POST /crm/hubspot/oauth/callback
  fastify.post("/hubspot/oauth/callback", { preHandler: requireAuth }, async (request, reply) => {
    const { orgId } = request.user as JWTPayload;
    const { code } = request.body as { code: string };
    if (!code) return reply.code(400).send({ error: "Missing code parameter" });

    const tokens = await exchangeHubSpotCode(code, getRedirectUri());
    const credentialsJson = { hubspot: tokens };

    const existing = await (prisma.crmConnection as any).findFirst({
      where: { orgId, crmType: "hubspot" },
    });

    if (existing) {
      await (prisma.crmConnection as any).update({
        where: { id: existing.id },
        data: { credentialsJson },
      });
    } else {
      await (prisma.crmConnection as any).create({
        data: { orgId, crmType: "hubspot", credentialsJson },
      });
    }

    return { connected: true, portalId: tokens.portalId };
  });

  // DELETE /crm/:crmType/disconnect
  fastify.delete("/:crmType/disconnect", { preHandler: requireRole("ORG_ADMIN", "MANAGER") }, async (request, reply) => {
    const orgId = orgScope(request);
    const { crmType } = request.params as { crmType: string };
    const connection = await (prisma.crmConnection as any).findFirst({ where: { orgId, crmType } });
    if (!connection) return reply.code(404).send({ error: "CRM connection not found" });
    await (prisma.crmConnection as any).delete({ where: { id: connection.id } });
    return { disconnected: true };
  });

  // POST /crm/:crmType/sync — full sync (push all unseen contacts)
  fastify.post("/:crmType/sync", { preHandler: requireRole("ORG_ADMIN", "MANAGER") }, async (request, reply) => {
    const orgId = orgScope(request);
    const { crmType } = request.params as { crmType: string };
    if (crmType !== "hubspot") return reply.code(400).send({ error: `Unsupported CRM: ${crmType}` });

    const connection = await (prisma.crmConnection as any).findFirst({ where: { orgId, crmType } });
    if (!connection) return reply.code(404).send({ error: "CRM connection not found" });

    const accessToken = await getValidHubSpotToken(connection);

    // Find already-synced contact IDs
    const syncedRows = await (prisma.crmSyncLog as any).findMany({
      where: { connectionId: connection.id, entityType: "CONTACT", status: "success" },
      select: { entityId: true },
    });
    const syncedIds: string[] = syncedRows.map((r: any) => r.entityId);

    const contacts = await prisma.contact.findMany({
      where: { orgId, deletedAt: null, id: { notIn: syncedIds } },
      include: { company: { select: { name: true } } },
      take: 200, // batch limit
    });

    let pushed = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        const externalId = await pushContactToHubSpot(contact as any, accessToken);
        await (prisma.crmSyncLog as any).create({
          data: {
            connectionId: connection.id,
            entityType: "CONTACT",
            entityId: contact.id,
            externalId,
            status: "success",
          },
        });
        pushed++;
      } catch (err: any) {
        await (prisma.crmSyncLog as any).create({
          data: {
            connectionId: connection.id,
            entityType: "CONTACT",
            entityId: contact.id,
            status: "error",
            error: err?.message ?? "Unknown error",
          },
        });
        failed++;
      }
    }

    await (prisma.crmConnection as any).update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return { pushed, failed, total: contacts.length };
  });

  // GET /crm/:crmType/sync-log
  fastify.get("/:crmType/sync-log", { preHandler: requireRole("ORG_ADMIN", "MANAGER") }, async (request, reply) => {
    const orgId = orgScope(request);
    const { crmType } = request.params as { crmType: string };
    const connection = await (prisma.crmConnection as any).findFirst({ where: { orgId, crmType } });
    if (!connection) return reply.code(404).send({ error: "CRM connection not found" });
    return (prisma.crmSyncLog as any).findMany({
      where: { connectionId: connection.id },
      orderBy: { syncedAt: "desc" },
      take: 50,
    });
  });

  // POST /crm/:crmType/push/contact/:contactId
  fastify.post("/:crmType/push/contact/:contactId", { preHandler: requireAuth }, async (request, reply) => {
    const orgId = orgScope(request);
    const { crmType, contactId } = request.params as { crmType: string; contactId: string };
    if (crmType !== "hubspot") return reply.code(400).send({ error: `Unsupported CRM: ${crmType}` });

    const connection = await (prisma.crmConnection as any).findFirst({ where: { orgId, crmType } });
    if (!connection) return reply.code(404).send({ error: "Not connected to HubSpot" });

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId, deletedAt: null },
      include: { company: { select: { name: true } } },
    });
    if (!contact) return reply.code(404).send({ error: "Contact not found" });

    const accessToken = await getValidHubSpotToken(connection);
    try {
      const externalId = await pushContactToHubSpot(contact as any, accessToken);
      await (prisma.crmSyncLog as any).create({
        data: {
          connectionId: connection.id,
          entityType: "CONTACT",
          entityId: contact.id,
          externalId,
          status: "success",
        },
      });
      return { pushed: true, externalId };
    } catch (err: any) {
      await (prisma.crmSyncLog as any).create({
        data: {
          connectionId: connection.id,
          entityType: "CONTACT",
          entityId: contact.id,
          status: "error",
          error: err?.message ?? "Push failed",
        },
      });
      return reply.code(500).send({ error: err?.message ?? "Push failed" });
    }
  });

  // POST /crm/:crmType/push/company/:companyId
  fastify.post("/:crmType/push/company/:companyId", { preHandler: requireAuth }, async (request, reply) => {
    const orgId = orgScope(request);
    const { crmType, companyId } = request.params as { crmType: string; companyId: string };
    if (crmType !== "hubspot") return reply.code(400).send({ error: `Unsupported CRM: ${crmType}` });

    const connection = await (prisma.crmConnection as any).findFirst({ where: { orgId, crmType } });
    if (!connection) return reply.code(404).send({ error: "Not connected to HubSpot" });

    const company = await prisma.company.findFirst({ where: { id: companyId, orgId, deletedAt: null } });
    if (!company) return reply.code(404).send({ error: "Company not found" });

    const accessToken = await getValidHubSpotToken(connection);
    try {
      const externalId = await pushCompanyToHubSpot(company as any, accessToken);
      await (prisma.crmSyncLog as any).create({
        data: {
          connectionId: connection.id,
          entityType: "COMPANY",
          entityId: company.id,
          externalId,
          status: "success",
        },
      });
      return { pushed: true, externalId };
    } catch (err: any) {
      await (prisma.crmSyncLog as any).create({
        data: {
          connectionId: connection.id,
          entityType: "COMPANY",
          entityId: company.id,
          status: "error",
          error: err?.message ?? "Push failed",
        },
      });
      return reply.code(500).send({ error: err?.message ?? "Push failed" });
    }
  });
};
