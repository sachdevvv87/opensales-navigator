"use client";
import { Users, Building2, List, Activity, CheckSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@opensales/ui";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useActivities } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { formatRelativeTime } from "@opensales/shared";

function StatCard({ title, value, icon: Icon, description, loading }: { title: string; value?: number; icon: React.ElementType; description?: string; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value?.toLocaleString() ?? "—"}</div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentActivities } = useActivities({ page: 1, limit: 5 });
  const { data: recentContacts } = useContacts({ limit: 5, sortBy: "createdAt", sortOrder: "desc" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Total Contacts" value={stats?.totalContacts} icon={Users} loading={statsLoading} />
        <StatCard title="Companies" value={stats?.totalCompanies} icon={Building2} loading={statsLoading} />
        <StatCard title="Lists" value={stats?.totalLists} icon={List} loading={statsLoading} />
        <StatCard title="Activities This Week" value={stats?.activitiesThisWeek} icon={Activity} loading={statsLoading} />
        <StatCard title="Tasks Due" value={stats?.tasksDue} icon={CheckSquare} description="Overdue tasks" loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentContacts?.data.length === 0 && (
              <p className="text-sm text-muted-foreground">No contacts yet. Import your first CSV.</p>
            )}
            <div className="space-y-3">
              {recentContacts?.data.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.title ?? c.email ?? "No title"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(c.createdAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities?.data.length === 0 && (
              <p className="text-sm text-muted-foreground">No activities yet. Log your first note or call.</p>
            )}
            <div className="space-y-3">
              {recentActivities?.data.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs shrink-0">
                    {a.type === "NOTE" ? "📝" : a.type === "CALL" ? "📞" : a.type === "TASK" ? "✅" : "📧"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.type}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.body ?? "No notes"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
