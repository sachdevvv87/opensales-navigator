import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Activity {
  id: string;
  entityType: string;
  contactId?: string | null;
  companyId?: string | null;
  type: string;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; avatarUrl?: string | null };
}

export function useActivities(params: { contactId?: string; companyId?: string; type?: string; overdue?: boolean; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["activities", params],
    queryFn: async () => {
      const { data } = await api.get("/activities", { params });
      return data as { data: Activity[]; pagination: { total: number; page: number; totalPages: number; limit: number; hasNext: boolean; hasPrev: boolean } };
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Activity>) => api.post("/activities", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useUpdateActivity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Activity>) => api.patch(`/activities/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}
