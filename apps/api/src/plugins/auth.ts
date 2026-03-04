import { FastifyRequest, FastifyReply } from "fastify";
import { UserRole } from "@opensales/database";

export interface JWTPayload {
  userId: string;
  orgId: string;
  role: UserRole;
  email: string;
  type?: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (!roles.includes(request.user.role)) {
      reply.code(403).send({ error: "Forbidden", message: "Insufficient permissions" });
    }
  };
}

export function orgScope(request: FastifyRequest): string {
  return request.user.orgId;
}
