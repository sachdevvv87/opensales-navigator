import { Worker, Job } from "bullmq";
import { prisma } from "@opensales/database";
import { getRedisConnection } from "../redis";
import type { AuditLogJobData } from "../queues";

export function createAuditWorker() {
  const worker = new Worker<AuditLogJobData>(
    "audit",
    async (job: Job<AuditLogJobData>) => {
      const { orgId, userId, action, entityType, entityId, diff, ip } = job.data;

      await prisma.auditLog.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { orgId, userId, action, entityType, entityId, diff: (diff ?? undefined) as any, ip },
      });
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 10,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[audit] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
