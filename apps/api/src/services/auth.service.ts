import bcrypt from "bcryptjs";
import { FastifyInstance } from "fastify";
import { prisma, UserRole } from "@opensales/database";
import { nanoid } from "nanoid";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signTokens(
  fastify: FastifyInstance,
  payload: { userId: string; orgId: string; role: UserRole; email: string }
) {
  const accessToken = fastify.jwt.sign(payload, { expiresIn: "15m" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshToken = (fastify.jwt.sign as any)({ userId: payload.userId, type: "refresh" }, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

export async function generateInviteToken(): Promise<string> {
  return nanoid(32);
}

export async function getUserWithOrg(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { org: { select: { id: true, name: true, slug: true, settings: true } } },
  });
}
