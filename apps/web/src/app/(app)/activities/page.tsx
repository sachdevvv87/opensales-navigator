"use client";
import { useState } from "react";
import { CheckSquare, Clock, Calendar } from "lucide-react";
import { Button, Badge, Skeleton } from "@opensales/ui";
import { useActivities, useUpdateActivity, Activity } from "@/hooks/useActivities";
import { formatDate } from "@opensales/shared";
import { toast } from "sonner";

export default function ActivitiesPage() {
  const [filter, setFilter] = useState<"all" | "tasks" | "overdue">("all");
  const { data, isLoading } = useActivities({
    ...(filter === "tasks" ? { type: "TASK" } : {}),
    ...(filter === "overdue" ? { overdue: true } : {}),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Activities</h1>
        <p className="text-muted-foreground text-sm">Track your notes, calls, emails, and tasks</p>
      </div>

      <div className="flex gap-2">
        {(["all", "tasks", "overdue"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          : data?.data.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
        {data?.data.length === 0 && !isLoading && (
          <p className="text-center text-muted-foreground py-12">No activities found.</p>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const update = useUpdateActivity(activity.id);
  const isOverdue = activity.dueAt && !activity.completedAt && new Date(activity.dueAt) < new Date();

  async function complete() {
    await update.mutateAsync({ completedAt: new Date().toISOString() });
    toast.success("Task completed!");
  }

  return (
    <div className={`flex items-start gap-4 p-4 rounded-md border bg-card hover:bg-muted/30 transition-colors ${activity.completedAt ? "opacity-60" : ""}`}>
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
        {activity.type === "NOTE" ? "📝" : activity.type === "CALL" ? "📞" : activity.type === "TASK" ? "✅" : "📧"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs">{activity.type}</Badge>
          {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
          {activity.completedAt && <Badge variant="outline" className="text-xs text-green-600">Done</Badge>}
        </div>
        <p className="text-sm">{activity.body ?? "No description"}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{activity.createdBy.name}</span>
          {activity.dueAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />Due {formatDate(activity.dueAt)}
            </span>
          )}
        </div>
      </div>
      {activity.type === "TASK" && !activity.completedAt && (
        <Button size="sm" variant="outline" onClick={complete} disabled={update.isPending}>
          <CheckSquare className="w-3 h-3 mr-1" />Complete
        </Button>
      )}
    </div>
  );
}
