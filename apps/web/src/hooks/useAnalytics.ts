import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface PipelineRow {
  stage: string;
  count: number;
}

export interface ActivityTypeRow {
  type: string;
  count: number;
}

export interface ContactTrendRow {
  date: string;
  count: number;
}

export interface RepLeaderboardRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  count: number;
}

export interface LeadScoreRow {
  bucket: number;
  count: number;
}

export interface IndustryRow {
  industry: string;
  count: number;
}

export function usePipeline() {
  return useQuery({
    queryKey: ["analytics", "pipeline"],
    queryFn: async () => {
      const { data } = await api.get<PipelineRow[]>("/analytics/pipeline");
      return data;
    },
  });
}

export function useActivitiesByType() {
  return useQuery({
    queryKey: ["analytics", "activities-by-type"],
    queryFn: async () => {
      const { data } = await api.get<ActivityTypeRow[]>("/analytics/activities-by-type");
      return data;
    },
  });
}

export function useContactsTrend() {
  return useQuery({
    queryKey: ["analytics", "contacts-trend"],
    queryFn: async () => {
      const { data } = await api.get<ContactTrendRow[]>("/analytics/contacts-trend");
      return data;
    },
  });
}

export function useRepLeaderboard() {
  return useQuery({
    queryKey: ["analytics", "rep-leaderboard"],
    queryFn: async () => {
      const { data } = await api.get<RepLeaderboardRow[]>("/analytics/rep-leaderboard");
      return data;
    },
  });
}

export function useLeadScores() {
  return useQuery({
    queryKey: ["analytics", "lead-scores"],
    queryFn: async () => {
      const { data } = await api.get<LeadScoreRow[]>("/analytics/lead-scores");
      return data;
    },
  });
}

export function useCompaniesByIndustry() {
  return useQuery({
    queryKey: ["analytics", "companies-by-industry"],
    queryFn: async () => {
      const { data } = await api.get<IndustryRow[]>("/analytics/companies-by-industry");
      return data;
    },
  });
}
