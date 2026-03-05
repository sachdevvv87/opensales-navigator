import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface IcpConfig {
  titles?: string[];
  seniorities?: string[];
  industries?: string[];
  companySizes?: string[];
  locations?: string[];
}

export interface OrgSettings {
  icp?: IcpConfig;
  [key: string]: unknown;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  settings: OrgSettings;
}

export interface ProspectResult {
  firstName: string;
  lastName: string;
  email?: string;
  title?: string;
  companyName?: string;
  companyDomain?: string;
  locationCity?: string;
  locationCountry?: string;
  seniority?: string;
  department?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  alreadyInCrm: boolean;
}

export interface ProspectResponse {
  results: ProspectResult[];
  total: number;
  page: number;
}

export interface BulkImportResponse {
  created: number;
  skipped: number;
  total: number;
}

export interface EnrichmentStatus {
  apollo: boolean;
  hunter: boolean;
  clearbit: boolean;
}

export function useOrgSettings() {
  return useQuery({
    queryKey: ["org", "settings"],
    queryFn: async () => {
      const { data } = await api.get<OrgInfo>("/admin/settings");
      return data;
    },
  });
}

export function useSaveApiKeys() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (apiKeys: { apollo?: string; hunter?: string; clearbit?: string }) => {
      const { data } = await api.patch<OrgInfo>("/admin/settings", { apiKeys });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "settings"] });
      qc.invalidateQueries({ queryKey: ["enrichment", "status"] });
    },
  });
}

export function useSaveIcp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (icp: IcpConfig) => {
      const { data } = await api.patch<OrgInfo>("/admin/settings", { settings: { icp } });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "settings"] });
    },
  });
}

export function useEnrichmentStatus() {
  return useQuery({
    queryKey: ["enrichment", "status"],
    queryFn: async () => {
      const { data } = await api.get<EnrichmentStatus>("/enrichment/status");
      return data;
    },
  });
}

export function useProspect() {
  return useMutation({
    mutationFn: async ({ icp, page = 1 }: { icp?: IcpConfig | null; page?: number }) => {
      const { data } = await api.post<ProspectResponse>("/enrichment/prospect", {
        icp: icp ?? undefined,
        page,
      });
      return data;
    },
  });
}

export function useImportProspects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospects: ProspectResult[]) => {
      const { data } = await api.post<BulkImportResponse>("/enrichment/contacts/bulk-import", {
        prospects,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
