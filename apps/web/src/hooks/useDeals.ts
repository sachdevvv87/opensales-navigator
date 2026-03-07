import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function useHeaders() {
  const token = useAuthStore((s) => s.accessToken);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DealStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isClosed: boolean;
  isWon: boolean;
}

export interface Deal {
  id: string;
  name: string;
  value: number | null;
  currency: string;
  status: "OPEN" | "WON" | "LOST";
  stageId: string;
  stage: DealStage;
  probability: number | null;
  closeDate: string | null;
  notes: string | null;
  contact?: { id: string; firstName: string; lastName: string; email?: string; avatarUrl?: string } | null;
  company?: { id: string; name: string; logoUrl?: string } | null;
  owner: { id: string; name: string; avatarUrl?: string };
  createdAt: string;
}

export interface CreateDealInput {
  name: string;
  value?: number;
  currency?: string;
  stageId: string;
  probability?: number;
  closeDate?: string;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  notes?: string;
}

// ── Stages ─────────────────────────────────────────────────────────────────────

export function useDealStages() {
  const headers = useHeaders();
  return useQuery<DealStage[]>({
    queryKey: ["deal-stages"],
    queryFn: async () => {
      const r = await fetch(`${API}/deals/stages`, { headers });
      if (!r.ok) throw new Error("Failed to load stages");
      return r.json();
    },
  });
}

export function useCreateDealStage() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      const r = await fetch(`${API}/deals/stages`, { method: "POST", headers, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to create stage");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deal-stages"] }),
  });
}

export function useDeleteDealStage() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API}/deals/stages/${id}`, { method: "DELETE", headers });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete stage");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deal-stages"] }),
  });
}

// ── Deals ──────────────────────────────────────────────────────────────────────

export function useDeals(filters?: Record<string, string>) {
  const headers = useHeaders();
  const params = filters ? "?" + new URLSearchParams(filters).toString() : "";
  return useQuery<Deal[]>({
    queryKey: ["deals", filters],
    queryFn: async () => {
      const r = await fetch(`${API}/deals${params}`, { headers });
      if (!r.ok) throw new Error("Failed to load deals");
      return r.json();
    },
  });
}

export function useCreateDeal() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDealInput) => {
      const r = await fetch(`${API}/deals`, { method: "POST", headers, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to create deal");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useUpdateDeal() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateDealInput> & { id: string; status?: string }) => {
      const r = await fetch(`${API}/deals/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to update deal");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useMoveDeal() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const r = await fetch(`${API}/deals/${id}/move`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stageId }),
      });
      if (!r.ok) throw new Error("Failed to move deal");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useDeleteDeal() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API}/deals/${id}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error("Failed to delete deal");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}
