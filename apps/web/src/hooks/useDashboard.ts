import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  totalLists: number;
  activitiesThisWeek: number;
  tasksDue: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/admin/analytics/dashboard");
      return data as DashboardStats;
    },
  });
}
