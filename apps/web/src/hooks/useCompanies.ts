import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  revenueRange?: string | null;
  hqCity?: string | null;
  hqCountry?: string | null;
  accountTier: string;
  fundingStage: string;
  createdAt: string;
  accountOwner?: { id: string; name: string } | null;
  _count?: { contacts: number };
}

export function useCompanies(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["companies", params],
    queryFn: async () => {
      const { data } = await api.get("/companies", { params });
      return data as { data: Company[]; pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean } };
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Company>) => api.post("/companies", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Company>) => api.patch(`/companies/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
