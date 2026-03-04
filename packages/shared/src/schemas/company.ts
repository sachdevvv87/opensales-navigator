import { z } from "zod";

export const CompanyTypeEnum = z.enum([
  "PUBLIC",
  "PRIVATE",
  "NONPROFIT",
  "GOVERNMENT",
  "UNKNOWN",
]);

export const AccountTierEnum = z.enum(["STRATEGIC", "KEY", "STANDARD"]);

export const FundingStageEnum = z.enum([
  "BOOTSTRAPPED",
  "PRE_SEED",
  "SEED",
  "SERIES_A",
  "SERIES_B",
  "SERIES_C",
  "SERIES_D_PLUS",
  "PUBLIC",
  "UNKNOWN",
]);

export const CompanyCreateSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  domain: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  revenueRange: z.string().optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  companyType: CompanyTypeEnum.optional().default("UNKNOWN"),
  hqCity: z.string().optional(),
  hqCountry: z.string().optional(),
  techStack: z.array(z.string()).optional().default([]),
  fundingStage: FundingStageEnum.optional().default("UNKNOWN"),
  accountOwnerId: z.string().cuid().optional(),
  accountTier: AccountTierEnum.optional().default("STANDARD"),
  customFields: z.record(z.unknown()).optional(),
});

export const CompanyUpdateSchema = CompanyCreateSchema.partial();

export const CompanyFilterSchema = z.object({
  search: z.string().optional(),
  industry: z.array(z.string()).optional(),
  companyType: z.array(CompanyTypeEnum).optional(),
  accountTier: z.array(AccountTierEnum).optional(),
  fundingStage: z.array(FundingStageEnum).optional(),
  hqCountry: z.array(z.string()).optional(),
  employeeCountMin: z.number().optional(),
  employeeCountMax: z.number().optional(),
  accountOwnerId: z.array(z.string()).optional(),
});

export type CompanyCreateInput = z.infer<typeof CompanyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof CompanyUpdateSchema>;
export type CompanyFilterInput = z.infer<typeof CompanyFilterSchema>;
