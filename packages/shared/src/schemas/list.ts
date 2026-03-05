import { z } from "zod";
import { ContactFilterSchema } from "./contact";

export const ListTypeEnum = z.enum(["STATIC", "SMART"]);
export const ListPermissionEnum = z.enum(["OWNER", "EDITOR", "VIEWER"]);

export const ListCreateSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  type: ListTypeEnum.default("STATIC"),
  filterConfig: z.record(z.unknown()).optional(),
});

export const ListUpdateSchema = ListCreateSchema.partial();

export const AddToListSchema = z.object({
  entityType: z.enum(["CONTACT", "COMPANY"]),
  entityIds: z.array(z.string()).min(1),
});

export const SmartListFilterConfigSchema = ContactFilterSchema.omit({
  page: true,
  limit: true,
  sortBy: true,
  sortOrder: true,
});

export type ListCreateInput = z.infer<typeof ListCreateSchema>;
export type ListUpdateInput = z.infer<typeof ListUpdateSchema>;
export type AddToListInput = z.infer<typeof AddToListSchema>;
export type SmartListFilterConfig = z.infer<typeof SmartListFilterConfigSchema>;
