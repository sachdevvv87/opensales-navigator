import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface List {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  filterConfig?: Record<string, unknown> | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { contactMembers: number; companyMembers: number };
}

export interface ListDetail extends List {
  contactMembers: Array<{
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string | null;
      title?: string | null;
    };
  }>;
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
      return data as ListDetail;
    },
    enabled: !!id,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      type?: string;
      filterConfig?: Record<string, unknown>;
    }) => api.post("/lists", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });
}

export function useUpdateList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      description?: string;
      filterConfig?: Record<string, unknown>;
    }) => api.patch(`/lists/${listId}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists"] });
      qc.invalidateQueries({ queryKey: ["lists", listId] });
    },
  });
}

export function useRefreshSmartList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`/lists/${listId}/refresh`).then((r) => r.data as { count: number; message: string }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists"] });
      qc.invalidateQueries({ queryKey: ["lists", listId] });
    },
  });
}

export function useAddToList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { entityType: "CONTACT" | "COMPANY"; entityIds: string[] }) =>
      api.post(`/lists/${listId}/members`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists", listId] }),
  });
}

export function useRemoveFromList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) =>
      api.delete(`/lists/${listId}/members/${contactId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists", listId] }),
  });
}
