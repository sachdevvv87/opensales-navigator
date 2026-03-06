"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Button, Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Skeleton,
} from "@opensales/ui";
import api from "@/lib/api";
import { Search } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: unknown;
  ip: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

const ACTION_COLORS: Record<string, "default" | "info" | "warning" | "destructive"> = {
  CREATE: "info",
  UPDATE: "warning",
  DELETE: "destructive",
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", page, entityType],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (entityType) params.set("entityType", entityType);
      const { data } = await api.get<AuditResponse>(`/admin/audit-log?${params}`);
      return data;
    },
  });

  const logs = data?.data ?? [];

  return (
    <div className="max-w-6xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">All create, update, and delete actions in your organization.</p>
      </div>

      <div className="flex gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filter by entity type…"
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">
            {data ? `${data.total.toLocaleString()} events` : "Loading…"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No audit events yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{log.user.name}</div>
                      <div className="text-xs text-muted-foreground">{log.user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_COLORS[log.action] ?? "secondary"} className="text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entityType}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[100px] truncate">{log.entityId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ip ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {(data?.pages ?? 0) > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data?.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= (data?.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
