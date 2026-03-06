"use client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@opensales/ui";
import {
  usePipeline,
  useActivitiesByType,
  useContactsTrend,
  useRepLeaderboard,
  useLeadScores,
  useCompaniesByIndustry,
} from "@/hooks/useAnalytics";

// ── Colour palette ─────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  NEW: "#94a3b8",
  CONTACTED: "#60a5fa",
  QUALIFIED: "#a78bfa",
  PROPOSAL: "#fb923c",
  WON: "#34d399",
  LOST: "#f87171",
};

const ACTIVITY_COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#fb923c", "#f87171", "#fbbf24"];

// ── Small helpers ──────────────────────────────────────────────────────────────

function ChartCard({
  title,
  children,
  loading,
  minH = 280,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  minH?: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="w-full" style={{ height: minH }} />
        ) : (
          <div style={{ minHeight: minH }}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
      {label}
    </div>
  );
}

// ── Charts ─────────────────────────────────────────────────────────────────────

function PipelineFunnel() {
  const { data = [], isLoading } = usePipeline();
  const total = data.reduce((s, r) => s + r.count, 0);

  return (
    <ChartCard title="Lead Pipeline" loading={isLoading}>
      {data.every((r) => r.count === 0) ? (
        <EmptyState label="No contacts yet" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [
                `${value} (${total ? Math.round((value / total) * 100) : 0}%)`,
                "Contacts",
              ]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function ActivityBreakdown() {
  const { data = [], isLoading } = useActivitiesByType();

  return (
    <ChartCard title="Activities by Type (last 30 days)" loading={isLoading}>
      {data.length === 0 ? (
        <EmptyState label="No activities in last 30 days" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ type, percent }: { type: string; percent: number }) =>
                `${type} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((entry, idx) => (
                <Cell key={entry.type} fill={ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [v, "activities"]} />
            <Legend iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function ContactsTrend() {
  const { data = [], isLoading } = useContactsTrend();

  return (
    <ChartCard title="New Contacts (last 30 days)" loading={isLoading} minH={240}>
      {data.length === 0 ? (
        <EmptyState label="No contacts added in last 30 days" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="contactGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(d: string) => `Date: ${d}`}
              formatter={(v: number) => [v, "New contacts"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#contactGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function LeadScoreDistribution() {
  const { data = [], isLoading } = useLeadScores();

  return (
    <ChartCard title="Lead Score Distribution" loading={isLoading} minH={240}>
      {data.length === 0 ? (
        <EmptyState label="No contacts yet" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 11 }}
              tickFormatter={(b: number) => `${b}–${b + 9}`}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(b: number) => `Score ${b}–${b + 9}`}
              formatter={(v: number) => [v, "contacts"]}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function CompaniesByIndustry() {
  const { data = [], isLoading } = useCompaniesByIndustry();

  return (
    <ChartCard title="Companies by Industry" loading={isLoading} minH={240}>
      {data.length === 0 ? (
        <EmptyState label="No industry data yet" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="industry" tick={{ fontSize: 11 }} width={110} />
            <Tooltip formatter={(v: number) => [v, "companies"]} />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function RepLeaderboard() {
  const { data = [], isLoading } = useRepLeaderboard();

  return (
    <ChartCard title="Rep Leaderboard (last 30 days)" loading={isLoading} minH={240}>
      {data.length === 0 ? (
        <EmptyState label="No activity data yet" />
      ) : (
        <div className="space-y-2 pt-1">
          {data.map((rep, idx) => {
            const max = data[0]?.count ?? 1;
            const pct = Math.round((rep.count / max) * 100);
            return (
              <div key={rep.userId} className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted-foreground text-right shrink-0">
                  {idx + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {rep.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rep.avatarUrl} alt={rep.name} className="w-full h-full object-cover" />
                  ) : (
                    rep.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate">{rep.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {rep.count} activities
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Pipeline health, activity trends, and team performance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineFunnel />
        <ActivityBreakdown />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContactsTrend />
        <LeadScoreDistribution />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompaniesByIndustry />
        <RepLeaderboard />
      </div>
    </div>
  );
}
