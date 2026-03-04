import { createCsvImportWorker } from "./workers/csv-import.worker";
import { createAuditWorker } from "./workers/audit.worker";
import { createNotificationWorker } from "./workers/notification.worker";
import { closeRedisConnection } from "./redis";
import { prisma } from "@opensales/database";

console.log("🚀 Starting OpenSales Navigator workers...");

// Start all workers
const csvImportWorker = createCsvImportWorker();
const auditWorker = createAuditWorker();
const notificationWorker = createNotificationWorker();

console.log("✅ Workers started:");
console.log("   - csv-import worker (concurrency: 2)");
console.log("   - audit worker (concurrency: 10)");
console.log("   - notification worker (concurrency: 5)");

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down workers...`);
  await Promise.all([
    csvImportWorker.close(),
    auditWorker.close(),
    notificationWorker.close(),
  ]);
  await closeRedisConnection();
  await prisma.$disconnect();
  console.log("Workers shut down gracefully.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Keep process alive
process.on("unhandledRejection", (reason, promise) => {
  console.error("[worker] Unhandled Rejection:", reason);
});
