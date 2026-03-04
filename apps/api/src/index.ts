import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";

import { dbPlugin } from "./plugins/db";
import { authRoutes } from "./routes/auth";
import { contactsRoutes } from "./routes/contacts";
import { companiesRoutes } from "./routes/companies";
import { listsRoutes } from "./routes/lists";
import { activitiesRoutes } from "./routes/activities";
import { savedSearchesRoutes } from "./routes/saved-searches";
import { notificationsRoutes } from "./routes/notifications";
import { adminRoutes } from "./routes/admin";

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

async function buildServer() {
  // CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  // Rate limiting
  await server.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
  });

  // JWT
  await server.register(jwt, {
    secret: process.env.JWT_SECRET ?? "change-me-in-production-use-long-random-string",
    sign: { expiresIn: "15m" },
  });

  // Multipart (file uploads)
  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // Database
  await server.register(dbPlugin);

  // Health check
  server.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Routes
  await server.register(authRoutes, { prefix: "/api/v1/auth" });
  await server.register(contactsRoutes, { prefix: "/api/v1/contacts" });
  await server.register(companiesRoutes, { prefix: "/api/v1/companies" });
  await server.register(listsRoutes, { prefix: "/api/v1/lists" });
  await server.register(activitiesRoutes, { prefix: "/api/v1/activities" });
  await server.register(savedSearchesRoutes, { prefix: "/api/v1/saved-searches" });
  await server.register(notificationsRoutes, { prefix: "/api/v1/notifications" });
  await server.register(adminRoutes, { prefix: "/api/v1/admin" });

  return server;
}

async function start() {
  try {
    const app = await buildServer();
    const port = parseInt(process.env.PORT ?? "4000");
    const host = process.env.HOST ?? "0.0.0.0";
    await app.listen({ port, host });
    console.log(`API server running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
