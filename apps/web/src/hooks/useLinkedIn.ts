import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function useHeaders() {
  const token = useAuthStore((s) => s.accessToken);
  return { Authorization: `Bearer ${token}` };
}

export interface LinkedInAccount {
  id: string;
  name: string;
  email: string | null;
  pictureUrl: string | null;
  headline: string | null;
  profileUrl: string | null;
  lastSyncAt: string | null;
  connectionsCount: number | null;
  scopes: string[];
  expiresAt: string | null;
}

export interface LinkedInStatus {
  configured: boolean;
  connected: boolean;
  account: Pick<LinkedInAccount, "name" | "email" | "pictureUrl" | "lastSyncAt"> | null;
}

export interface LinkedInImportLog {
  id: string;
  fileName: string;
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  status: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface CsvPreview {
  total: number;
  preview: Array<{
    firstName: string;
    lastName: string;
    url: string;
    emailAddress: string;
    company: string;
    position: string;
    connectedOn: string;
  }>;
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function useLinkedInStatus() {
  const headers = useHeaders();
  return useQuery<LinkedInStatus>({
    queryKey: ["linkedin-status"],
    queryFn: async () => {
      const r = await fetch(`${API}/linkedin/status`, { headers });
      if (!r.ok) throw new Error("Failed to load LinkedIn status");
      return r.json();
    },
  });
}

export function useLinkedInImportLogs() {
  const headers = useHeaders();
  return useQuery<LinkedInImportLog[]>({
    queryKey: ["linkedin-import-logs"],
    queryFn: async () => {
      const r = await fetch(`${API}/linkedin/import-logs`, { headers });
      if (!r.ok) throw new Error("Failed to load import logs");
      return r.json();
    },
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useLinkedInOAuthUrl() {
  const headers = useHeaders();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/linkedin/oauth/url`, { headers });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to get LinkedIn OAuth URL");
      }
      return r.json() as Promise<{ url: string; state: string }>;
    },
  });
}

export function useDisconnectLinkedIn() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/linkedin/account`, { method: "DELETE", headers });
      if (!r.ok) throw new Error("Failed to disconnect LinkedIn");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linkedin-status"] });
      qc.invalidateQueries({ queryKey: ["linkedin-import-logs"] });
    },
  });
}

export function useSyncLinkedInProfile() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/linkedin/sync-profile`, { method: "POST", headers });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to sync profile");
      }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["linkedin-status"] }),
  });
}

export function usePreviewLinkedInCsv() {
  const headers = useHeaders();
  return useMutation({
    mutationFn: async (file: File): Promise<CsvPreview> => {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${API}/linkedin/preview-csv`, {
        method: "POST",
        headers: { Authorization: headers.Authorization },
        body: form,
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to parse CSV");
      }
      return r.json();
    },
  });
}

export function useImportLinkedInCsv() {
  const headers = useHeaders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${API}/linkedin/import`, {
        method: "POST",
        headers: { Authorization: headers.Authorization },
        body: form,
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? "Import failed");
      }
      return r.json() as Promise<{ logId: string; totalRows: number; imported: number; skipped: number; failed: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linkedin-import-logs"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
