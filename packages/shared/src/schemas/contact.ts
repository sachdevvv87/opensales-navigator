import { z } from "zod";

export const SeniorityEnum = z.enum([
  "C_SUITE",
  "VP",
  "DIRECTOR",
  "MANAGER",
  "IC",
  "ENTRY",
  "UNKNOWN",
]);

export const LeadStageEnum = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
]);

export const ContactCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  seniority: SeniorityEnum.optional().default("UNKNOWN"),
  department: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  companyId: z.string().cuid().optional(),
  locationCity: z.string().optional(),
  locationCountry: z.string().optional(),
  leadStage: LeadStageEnum.optional().default("NEW"),
  leadScore: z.number().int().min(0).max(100).optional().default(0),
  assignedToId: z.string().cuid().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  customFields: z.record(z.unknown()).optional(),
});

export const ContactUpdateSchema = ContactCreateSchema.partial();

export const ContactFilterSchema = z.object({
  search: z.string().optional(),
  leadStage: z.array(LeadStageEnum).optional(),
  seniority: z.array(SeniorityEnum).optional(),
  department: z.array(z.string()).optional(),
  companyId: z.array(z.string()).optional(),
  assignedToId: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  locationCountry: z.array(z.string()).optional(),
  leadScoreMin: z.number().int().min(0).max(100).optional(),
  leadScoreMax: z.number().int().min(0).max(100).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  listId: z.string().optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
});

export const BulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID required"),
  action: z.enum(["tag", "untag", "assign", "delete", "export", "add-to-list", "change-stage"]),
  payload: z.record(z.unknown()).optional(),
});

export const CsvImportSchema = z.object({
  columnMapping: z.record(z.string()),
  skipDuplicates: z.boolean().default(true),
  autoEnrich: z.boolean().default(false),
});

export type ContactCreateInput = z.infer<typeof ContactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof ContactUpdateSchema>;
export type ContactFilterInput = z.infer<typeof ContactFilterSchema>;
export type BulkActionInput = z.infer<typeof BulkActionSchema>;
export type CsvImportInput = z.infer<typeof CsvImportSchema>;
