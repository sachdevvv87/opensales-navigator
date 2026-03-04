import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@opensales/database";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof prisma;
  }
}

const dbPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate("db", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});

export { dbPlugin };
