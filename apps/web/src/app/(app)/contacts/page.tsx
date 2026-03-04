"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Upload, Search, Filter, MoreHorizontal, Trash2, Tag, UserCheck } from "lucide-react";
import { Button, Input, Badge, Skeleton } from "@opensales/ui";
import { useContacts, useBulkAction, type Contact } from "@/hooks/useContacts";
import { toast } from "sonner";

const STAGE_COLORS: Record<string, "default" | "info" | "success" | "warning" | "destructive"> = {
  NEW: "default",
  CONTACTED: "info",
  QUALIFIED: "success",
  PROPOSAL: "warning",
  WON: "success",
  LOST: "destructive",
};

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stageFilter, setStageFilter] = useState<string>("");

  const { data, isLoading } = useContacts({ search, page, limit: 25, ...(stageFilter ? { leadStage: stageFilter } : {}) });
  const bulkAction = useBulkAction();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    if (selectedIds.size === data.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.data.map((c) => c.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} contacts?`)) return;
    await bulkAction.mutateAsync({ ids: Array.from(selectedIds), action: "delete" });
    setSelectedIds(new Set());
    toast.success(`Deleted ${selectedIds.size} contacts`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          {data && <p className="text-muted-foreground text-sm">{data.pagination.total.toLocaleString()} total</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/contacts/import"><Upload className="w-4 h-4 mr-2" />Import CSV</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/contacts/new"><Plus className="w-4 h-4 mr-2" />Add Contact</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Stages</option>
          {["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md border border-primary/20">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-1" />Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={data ? selectedIds.size === data.data.length && data.data.length > 0 : false}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Company</th>
              <th className="text-left p-3 font-medium">Stage</th>
              <th className="text-left p-3 font-medium">Score</th>
              <th className="text-left p-3 font-medium">Tags</th>
              <th className="w-10 p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              : data?.data.map((contact) => (
                  <tr key={contact.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                      />
                    </td>
                    <td className="p-3">
                      <Link href={`/contacts/${contact.id}`} className="flex items-center gap-2 hover:text-primary">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                          {contact.email && <div className="text-xs text-muted-foreground">{contact.email}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{contact.title ?? "—"}</td>
                    <td className="p-3">{contact.company?.name ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={STAGE_COLORS[contact.leadStage] ?? "default"} className="text-xs">
                        {contact.leadStage}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${contact.leadScore}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{contact.leadScore}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {contact.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs py-0">{tag}</Badge>
                        ))}
                        {contact.tags.length > 2 && <Badge variant="outline" className="text-xs py-0">+{contact.tags.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!data.pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
