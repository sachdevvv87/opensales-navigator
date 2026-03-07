import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function useHeaders() {
  const token = useAuthStore((s) => s.accessToken);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SequenceStep {
  id: string;
  order: number;
  subject: string;
  body: string;
  delayDays: number;
}

export interface SequenceEnrollment {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "REPLIED" | "UNSUBSCRIBED" | "BOUNCED" | "PAUSED";
  currentStep: number;
  nextSendAt: string | null;
  startedAt: string;
  completedAt: string | null;
  contact: { id: string; firstName: string; lastName: string; email?: string; avatarUrl?: string };
}

export interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdBy: { id: string; name: string; avatarUrl?: string };
  steps: SequenceStep[];
  enrollments?: SequenceEnrollment[];
  _count: { enrollments: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSequenceInput {
  name: string;
  description?: string;
  steps?: Array<{ subject: string; body: string; delayDays: number; order: number }>;
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function useSequences(status?: string) {
  const headers = useHeaders();
  const params = status ? `?status=${status}` : "";
  return useQuery<EmailSequence[]>({
    queryKey: ["sequences", status],
    queryFn: async () => {
      const r = await fetch(`${API}/sequences${params}`, { headers });
      if (!r.ok) throw new Error("Failed to load sequences");
      return r.json();
    },
  });
}

export function useSequence(id: string) {
  const headers = useHeaders();
  return useQuery<EmailSequence>({
    queryKey: ["sequences", id],
    queryFn: async () => {
      const r = await fetch(`${API}/sequences/${id}`, { headers });
      if (!r.ok) throw new Error("Sequence not found");
      return r.json();
    },
    enabled: !!id,
  });
}

export function useSequenceEnrollments(sequenceId: string, status?: string) {
  const headers = useHeaders();
  const params = status ? `?status=${status}` : "";
  return useQuery<SequenceEnrollment[]>({
    queryKey: ["sequence-enrollments", sequenceId, status],
    queryFn: async () => {
      const r = await fetch(`${API}/sequences/${sequenceId}/enrollments${params}`, { headers });
      if (!r.ok) throw new Error("Failed to load enrollments");
      return r.json();
    },
    enabled: !!sequenceId,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useCreateSequence() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSequenceInput) => {
      const r = await fetch(`${API}/sequences`, { method: "POST", headers, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to create sequence");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useUpdateSequence() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<CreateSequenceInput> & { id: string; status?: string }) => {
      const r = await fetch(`${API}/sequences/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to update sequence");
      return r.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      qc.invalidateQueries({ queryKey: ["sequences", vars.id] });
    },
  });
}

export function useDeleteSequence() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API}/sequences/${id}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error("Failed to delete sequence");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useEnrollContacts() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequenceId, contactIds }: { sequenceId: string; contactIds: string[] }) => {
      const r = await fetch(`${API}/sequences/${sequenceId}/enroll`, {
        method: "POST",
        headers,
        body: JSON.stringify({ contactIds }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to enroll contacts");
      }
      return r.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sequence-enrollments", vars.sequenceId] });
      qc.invalidateQueries({ queryKey: ["sequences", vars.sequenceId] });
    },
  });
}
