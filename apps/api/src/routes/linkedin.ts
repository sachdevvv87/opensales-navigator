import { FastifyPluginAsync } from "fastify";
import { prisma } from "@opensales/database";
import { requireAuth, orgScope } from "../plugins/auth";
import {
  getOAuthUrl,
  exchangeCode,
  fetchLinkedInProfile,
  upsertLinkedInAccount,
  getLinkedInAccount,
  disconnectLinkedIn,
  parseLinkedInCsv,
  importLinkedInConnections,
} from "../services/linkedin.service";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import { createWriteStream, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

export const linkedInRoutes: FastifyPluginAsync = async (fastify) => {
  // ── OAuth ──────────────────────────────────────────────────────────────────

  // GET /linkedin/oauth/url — get LinkedIn OAuth URL
  fastify.get("/oauth/url", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;

    if (!process.env.LINKEDIN_CLIENT_ID) {
      return reply.code(503).send({
        error: "LinkedIn not configured",
        message: "Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env",
      });
    }

    const state = `${userId}:${randomBytes(16).toString("hex")}`;
    const url = getOAuthUrl(state);
    return { url, state };
  });

  // GET /linkedin/oauth/callback — LinkedIn redirects here
  fastify.get("/oauth/callback", async (request, reply) => {
    const { code, state, error, error_description } = request.query as Record<string, string>;

    const webBaseUrl = process.env.WEB_URL ?? "http://localhost:3000";

    if (error) {
      return reply.redirect(`${webBaseUrl}/integrations?linkedin_error=${encodeURIComponent(error_description ?? error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${webBaseUrl}/integrations?linkedin_error=missing_code`);
    }

    // Decode state to get userId
    const [userId] = state.split(":");
    if (!userId) {
      return reply.redirect(`${webBaseUrl}/integrations?linkedin_error=invalid_state`);
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      const tokenData = await exchangeCode(code);
      const profile = await fetchLinkedInProfile(tokenData.access_token);

      await upsertLinkedInAccount(userId, user.orgId, tokenData, profile);

      return reply.redirect(`${webBaseUrl}/integrations?linkedin_connected=1`);
    } catch (err: any) {
      console.error("[linkedin] OAuth callback error:", err.message);
      return reply.redirect(`${webBaseUrl}/integrations?linkedin_error=${encodeURIComponent(err.message)}`);
    }
  });

  // GET /linkedin/account — get connected account info
  fastify.get("/account", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const account = await getLinkedInAccount(userId);
    if (!account) return reply.code(404).send({ error: "No LinkedIn account connected" });
    // Return safe subset (no tokens)
    const { accessToken, refreshToken, ...safe } = account;
    return safe;
  });

  // DELETE /linkedin/account — disconnect
  fastify.delete("/account", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    await disconnectLinkedIn(userId);
    return reply.code(204).send();
  });

  // POST /linkedin/sync-profile — re-sync profile from LinkedIn API
  fastify.post("/sync-profile", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const account = await getLinkedInAccount(userId);
    if (!account) return reply.code(404).send({ error: "No LinkedIn account connected" });

    // Check token not expired
    if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
      return reply.code(401).send({ error: "LinkedIn token expired. Please reconnect." });
    }

    try {
      const profile = await fetchLinkedInProfile(account.accessToken);
      const orgId = orgScope(request);
      const updated = await upsertLinkedInAccount(
        userId,
        orgId,
        { access_token: account.accessToken, expires_in: 3600, scope: account.scopes.join(" ") },
        profile
      );
      const { accessToken, refreshToken, ...safe } = updated;
      return safe;
    } catch (err: any) {
      return reply.code(502).send({ error: "Failed to sync LinkedIn profile", message: err.message });
    }
  });

  // ── Connections CSV Import ─────────────────────────────────────────────────

  // POST /linkedin/import — upload LinkedIn connections CSV
  fastify.post("/import", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const orgId = orgScope(request);

    // Parse multipart
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: "No file uploaded" });

    // Save to temp file
    const tmpPath = join(tmpdir(), `linkedin-import-${userId}-${Date.now()}.csv`);
    await pipeline(data.file, createWriteStream(tmpPath));

    let csvContent: string;
    try {
      csvContent = readFileSync(tmpPath, "utf-8");
      unlinkSync(tmpPath);
    } catch {
      unlinkSync(tmpPath).catch?.(() => {});
      return reply.code(400).send({ error: "Failed to read uploaded file" });
    }

    // Parse CSV
    let connections: Awaited<ReturnType<typeof parseLinkedInCsv>>;
    try {
      connections = parseLinkedInCsv(csvContent);
    } catch (err: any) {
      return reply.code(422).send({ error: err.message });
    }

    if (connections.length === 0) {
      return reply.code(422).send({ error: "No connections found in the CSV file" });
    }

    // Create import log
    const log = await (prisma.linkedInImportLog as any).create({
      data: {
        orgId,
        userId,
        fileName: data.filename ?? "connections.csv",
        totalRows: connections.length,
        status: "PROCESSING",
      },
    });

    // Import synchronously (for files up to ~5k rows this is fine; larger could be queued)
    const result = await importLinkedInConnections(connections, orgId, userId, log.id);

    return {
      logId: log.id,
      totalRows: connections.length,
      ...result,
    };
  });

  // GET /linkedin/import-logs — list past import logs
  fastify.get("/import-logs", { preHandler: requireAuth }, async (request) => {
    const orgId = orgScope(request);
    return (prisma.linkedInImportLog as any).findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { id: true, name: true } } },
    });
  });

  // GET /linkedin/status — config status (is LinkedIn app configured?)
  fastify.get("/status", { preHandler: requireAuth }, async (request) => {
    const { userId } = request.user;
    const configured = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    const account = configured ? await getLinkedInAccount(userId) : null;
    return {
      configured,
      connected: !!account,
      account: account
        ? { name: account.name, email: account.email, pictureUrl: account.pictureUrl, lastSyncAt: account.lastSyncAt }
        : null,
    };
  });

  // GET /linkedin/preview-csv — parse & preview without importing
  fastify.post("/preview-csv", { preHandler: requireAuth }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: "No file uploaded" });

    const tmpPath = join(tmpdir(), `li-preview-${Date.now()}.csv`);
    await pipeline(data.file, createWriteStream(tmpPath));

    let csvContent: string;
    try {
      csvContent = readFileSync(tmpPath, "utf-8");
      unlinkSync(tmpPath);
    } catch {
      return reply.code(400).send({ error: "Failed to read file" });
    }

    try {
      const connections = parseLinkedInCsv(csvContent);
      return {
        total: connections.length,
        preview: connections.slice(0, 5),
      };
    } catch (err: any) {
      return reply.code(422).send({ error: err.message });
    }
  });
};
