import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface List {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  ownerId: string;
  createdAt: string;
  _count?: { contactMembers: number; companyMembers: number };
}

export function useLists(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["lists", params],
    queryFn: async () => {
      const { data } = await api.get("/lists", { params });
      return data as { data: List[]; pagination: { total: number; page: number; totalPages: number } };
    },
  });
}

export function useList(id: string) {
  return useQuery({
    queryKey: ["lists", id],
    queryFn: async () => {
      const { data } = await api.get(`/lists/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; type?: string }) =>
      api.post("/lists", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });
}
