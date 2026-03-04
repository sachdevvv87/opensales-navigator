import { Worker, Job } from "bullmq";
import { prisma } from "@opensales/database";
import { getRedisConnection } from "../redis";
import type { NotificationJobData } from "../queues";

export function createNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    "notifications",
    async (job: Job<NotificationJobData>) => {
      const { orgId, userId, type, title, body, data, channels } = job.data;

      // 1. Persist in-app notification
      await prisma.notification.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { orgId, userId, type, title, body, data: (data ?? undefined) as any },
      });

      // 2. Email delivery (if configured)
      if (channels?.email) {
        console.log(`[notification] Email delivery queued for user ${userId}: ${title}`);
      }

      // 3. Slack webhook (if configured)
      if (channels?.slack) {
        try {
          await fetch(channels.slack, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: `*${title}*\n${body}` }),
          });
        } catch (err) {
          console.error(`[notification] Slack webhook failed:`, err);
        }
      }

      // 4. Custom webhook (if configured)
      if (channels?.webhook) {
        try {
          await fetch(channels.webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, title, body, data }),
          });
        } catch (err) {
          console.error(`[notification] Custom webhook failed:`, err);
        }
      }
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[notification] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[notification] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
