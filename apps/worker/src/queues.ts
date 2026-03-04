import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

// Job type definitions
export interface CsvImportJobData {
  orgId: string;
  userId: string;
  filePath: string;
  columnMapping: Record<string, string>;
  skipDuplicates: boolean;
}

export interface EnrichContactJobData {
  orgId: string;
  contactId: string;
  provider: string;
}

export interface EnrichCompanyJobData {
  orgId: string;
  companyId: string;
  provider: string;
}

export interface NotificationJobData {
  orgId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: {
    email?: boolean;
    slack?: string;
    webhook?: string;
  };
}

export interface AuditLogJobData {
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  diff?: Record<string, unknown>;
  ip?: string;
}

export interface SearchIndexSyncJobData {
  entityType: "CONTACT" | "COMPANY";
  entityId: string;
  operation: "upsert" | "delete";
}

// BullMQ bundles its own ioredis version - cast to avoid cross-version type conflict
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const conn = () => getRedisConnection() as any;

// Queue instances
export const csvImportQueue = new Queue<CsvImportJobData>("csv-import", {
  connection: conn(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const enrichmentQueue = new Queue<EnrichContactJobData | EnrichCompanyJobData>(
  "enrichment",
  {
    connection: conn(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 10000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  }
);

export const notificationQueue = new Queue<NotificationJobData>("notifications", {
  connection: conn(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 200,
  },
});

export const auditQueue = new Queue<AuditLogJobData>("audit", {
  connection: conn(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 500,
  },
});

export const searchSyncQueue = new Queue<SearchIndexSyncJobData>("search-sync", {
  connection: conn(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
  },
});
