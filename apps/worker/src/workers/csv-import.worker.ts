import { Worker, Job } from "bullmq";
import { prisma } from "@opensales/database";
import { getRedisConnection } from "../redis";
import type { CsvImportJobData } from "../queues";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

export function createCsvImportWorker() {
  const worker = new Worker<CsvImportJobData>(
    "csv-import",
    async (job: Job<CsvImportJobData>) => {
      const { orgId, userId, filePath, columnMapping, skipDuplicates } = job.data;

      console.log(`[csv-import] Processing job ${job.id} for org ${orgId}`);

      let csvContent: string;
      try {
        csvContent = readFileSync(filePath, "utf-8");
      } catch (err) {
        throw new Error(`Failed to read CSV file: ${filePath}`);
      }

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      let created = 0;
      let skipped = 0;
      let errors = 0;
      const batchSize = 50;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        for (const row of batch) {
          try {
            // Map CSV columns to contact fields
            const contactData: Record<string, string> = {};
            for (const [csvCol, field] of Object.entries(columnMapping)) {
              if (row[csvCol]) contactData[field] = String(row[csvCol]).trim();
            }

            // Skip rows without minimum required data
            if (!contactData.firstName && !contactData.lastName && !contactData.email) {
              skipped++;
              continue;
            }

            // Check for duplicates by email
            if (skipDuplicates && contactData.email) {
              const existing = await prisma.contact.findFirst({
                where: { orgId, email: contactData.email, deletedAt: null },
                select: { id: true },
              });
              if (existing) {
                skipped++;
                continue;
              }
            }

            await prisma.contact.create({
              data: {
                orgId,
                firstName: contactData.firstName ?? "",
                lastName: contactData.lastName ?? "",
                email: contactData.email || null,
                phone: contactData.phone || null,
                title: contactData.title || null,
                department: contactData.department || null,
                locationCity: contactData.locationCity || null,
                locationCountry: contactData.locationCountry || null,
                source: "csv_import",
                createdById: userId,
                tags: ["imported"],
              },
            });
            created++;
          } catch (err) {
            errors++;
            console.error(`[csv-import] Row error:`, err);
          }
        }

        // Update progress
        await job.updateProgress(Math.round((i / records.length) * 100));
      }

      console.log(`[csv-import] Done: created=${created}, skipped=${skipped}, errors=${errors}`);
      return { created, skipped, errors, total: records.length };
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[csv-import] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[csv-import] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
