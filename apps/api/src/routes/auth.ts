import { FastifyPluginAsync } from "fastify";
import { LoginSchema, RegisterSchema } from "@opensales/shared";
import { hashPassword, verifyPassword, signTokens, getUserWithOrg, generateInviteToken } from "../services/auth.service";
import { prisma } from "@opensales/database";
import { requireAuth } from "../plugins/auth";
import { generateSlug } from "@opensales/shared";
import { nanoid } from "nanoid";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/register
  fastify.post("/register", async (request, reply) => {
    const body = RegisterSchema.parse(request.body);
    const slug = body.orgSlug ?? generateSlug(body.orgName) + "-" + nanoid(6);

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return reply.code(409).send({ error: "Conflict", message: "Organization slug already taken" });
    }

    const org = await prisma.organization.create({
      data: { name: body.orgName, slug },
    });

    const existingUser = await prisma.user.findUnique({
      where: { orgId_email: { orgId: org.id, email: body.email } },
    });
    if (existingUser) {
      return reply.code(409).send({ error: "Conflict", message: "Email already registered" });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: { orgId: org.id, email: body.email, name: body.name, passwordHash, role: "ORG_ADMIN" },
    });

    const tokens = signTokens(fastify, { userId: user.id, orgId: org.id, role: user.role, email: user.email });
    return reply.code(201).send({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, org, ...tokens });
  });

  // POST /auth/login
  fastify.post("/login", async (request, reply) => {
    const body = LoginSchema.parse(request.body);

    let user;
    if (body.orgSlug) {
      const org = await prisma.organization.findUnique({ where: { slug: body.orgSlug } });
      if (!org) return reply.code(401).send({ error: "Invalid credentials" });
      user = await prisma.user.findUnique({ where: { orgId_email: { orgId: org.id, email: body.email } } });
    } else {
      user = await prisma.user.findFirst({ where: { email: body.email, deletedAt: null } });
    }

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const org = await prisma.organization.findUnique({ where: { id: user.orgId } });
    const tokens = signTokens(fastify, { userId: user.id, orgId: user.orgId, role: user.role, email: user.email });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, org, ...tokens };
  });

  // GET /auth/me
  fastify.get("/me", { preHandler: requireAuth }, async (request) => {
    const user = await getUserWithOrg(request.user.userId);
    if (!user) throw new Error("User not found");
    const { passwordHash, twoFaSecret, ...safeUser } = user;
    return safeUser;
  });

  // POST /auth/refresh
  fastify.post("/refresh", async (request, reply) => {
    const body = request.body as { refreshToken: string };
    try {
      const decoded = fastify.jwt.verify(body.refreshToken) as { userId: string; type: string };
      if (decoded.type !== "refresh") throw new Error("Invalid token type");
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) throw new Error("User not found");
      const tokens = signTokens(fastify, { userId: user.id, orgId: user.orgId, role: user.role, email: user.email });
      return tokens;
    } catch {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }
  });

  // PATCH /auth/me — update own profile (name, email, password)
  fastify.patch("/me", { preHandler: requireAuth }, async (request, reply) => {
    const { name, email, currentPassword, newPassword } = request.body as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    const userId = request.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.code(404).send({ error: "User not found" });

    const updates: Record<string, unknown> = {};
    if (name?.trim()) updates.name = name.trim();
    if (email?.trim()) updates.email = email.trim().toLowerCase();

    if (newPassword) {
      if (!currentPassword) return reply.code(400).send({ error: "Current password required" });
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) return reply.code(401).send({ error: "Current password is incorrect" });
      updates.passwordHash = await hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });
    return updated;
  });

  // POST /auth/logout
  fastify.post("/logout", { preHandler: requireAuth }, async () => {
    return { message: "Logged out successfully" };
  });
};
