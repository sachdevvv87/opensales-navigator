"use client";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@opensales/ui";
import { useDashboardStats } from "@/hooks/useDashboard";

export default function AnalyticsPage() {
  const { data } = useDashboardStats();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="text-muted-foreground">Advanced analytics coming in a future update.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contacts", value: data?.totalContacts },
          { label: "Total Companies", value: data?.totalCompanies },
          { label: "Activities this week", value: data?.activitiesThisWeek },
          { label: "Tasks Due", value: data?.tasksDue },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{value ?? "—"}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
