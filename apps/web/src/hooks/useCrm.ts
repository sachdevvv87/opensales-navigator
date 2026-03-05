import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CrmConnection {
  id: string;
  crmType: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface CrmSyncLog {
  id: string;
  entityType: string;
  entityId: string;
  direction: string;
  status: string;
  error: string | null;
  externalId: string | null;
  syncedAt: string;
}

export interface SyncResult {
  pushed: number;
  failed: number;
  total: number;
}

export interface AlertSettings {
  smtp: {
    host: string;
    port?: number;
    secure?: boolean;
    user: string;
    password: string;
    from?: string;
  } | null;
  slack: string | null;
  webhook: string | null;
}

export function useCrmConnections() {
  return useQuery({
    queryKey: ["crm", "connections"],
    queryFn: async () => {
      const { data } = await api.get<CrmConnection[]>("/crm/connections");
      return data;
    },
  });
}

export function useHubSpotOAuthUrl() {
  return useQuery({
    queryKey: ["crm", "hubspot", "oauth-url"],
    queryFn: async () => {
      const { data } = await api.get<{ url: string }>("/crm/hubspot/oauth/url");
      return data.url;
    },
    enabled: false, // only fetch on demand
  });
}

export function useDisconnectCrm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (crmType: string) => {
      await api.delete(`/crm/${crmType}/disconnect`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "connections"] });
    },
  });
}

export function useSyncCrm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (crmType: string) => {
      const { data } = await api.post<SyncResult>(`/crm/${crmType}/sync`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "connections"] });
      qc.invalidateQueries({ queryKey: ["crm", "sync-log"] });
    },
  });
}

export function useCrmSyncLog(crmType: string, enabled = true) {
  return useQuery({
    queryKey: ["crm", "sync-log", crmType],
    queryFn: async () => {
      const { data } = await api.get<CrmSyncLog[]>(`/crm/${crmType}/sync-log`);
      return data;
    },
    enabled,
  });
}

export function usePushContactToCrm() {
  return useMutation({
    mutationFn: async ({ crmType, contactId }: { crmType: string; contactId: string }) => {
      const { data } = await api.post<{ pushed: boolean; externalId: string }>(
        `/crm/${crmType}/push/contact/${contactId}`
      );
      return data;
    },
  });
}

export function useAlertSettings() {
  return useQuery({
    queryKey: ["notifications", "settings"],
    queryFn: async () => {
      const { data } = await api.get<AlertSettings>("/notifications/settings");
      return data;
    },
  });
}

export function useSaveAlertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<AlertSettings>) => {
      const { data } = await api.patch<AlertSettings>("/notifications/settings", settings);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "settings"] });
    },
  });
}
