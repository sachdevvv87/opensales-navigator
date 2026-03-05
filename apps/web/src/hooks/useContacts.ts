import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  seniority: string;
  department?: string | null;
  linkedinUrl?: string | null;
  leadScore: number;
  leadStage: string;
  tags: string[];
  locationCity?: string | null;
  locationCountry?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string; logoUrl?: string | null } | null;
  assignedTo?: { id: string; name: string; avatarUrl?: string | null } | null;
}

export interface ContactsParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  leadStage?: string[];
  seniority?: string[];
  department?: string[];
  locationCountry?: string[];
  assignedToId?: string[];
  tags?: string[];
  leadScoreMin?: number;
  leadScoreMax?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  listId?: string;
}

function serializeParams(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join("&");
}

export function useContacts(params: ContactsParams = {}) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: async () => {
      const queryString = serializeParams(params as Record<string, unknown>);
      const { data } = await api.get(`/contacts${queryString ? `?${queryString}` : ""}`);
      return data as { data: Contact[]; pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean } };
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const { data } = await api.get(`/contacts/${id}`);
      return data as Contact & { emails: { id: string; email: string; type: string; primary: boolean }[]; phones: { id: string; phone: string; type: string; primary: boolean }[] };
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Contact>) => api.post("/contacts", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Contact>) => api.patch(`/contacts/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); qc.invalidateQueries({ queryKey: ["contacts", id] }); },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useBulkAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; action: string; payload?: Record<string, unknown> }) =>
      api.post("/contacts/bulk-action", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
