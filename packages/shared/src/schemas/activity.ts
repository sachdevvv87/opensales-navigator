import { z } from "zod";

export const ActivityTypeEnum = z.enum([
  "NOTE",
  "CALL",
  "EMAIL",
  "TASK",
  "MEETING",
  "STAGE_CHANGE",
]);

export const ActivityCreateSchema = z.object({
  entityType: z.enum(["CONTACT", "COMPANY"]),
  contactId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  type: ActivityTypeEnum,
  body: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  dueAt: z.string().datetime().optional(),
});

export const ActivityUpdateSchema = z.object({
  body: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  dueAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

export type ActivityCreateInput = z.infer<typeof ActivityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof ActivityUpdateSchema>;
