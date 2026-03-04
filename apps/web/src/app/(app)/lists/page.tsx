"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, List } from "lucide-react";
import { Button, Card, CardContent, Badge, Skeleton } from "@opensales/ui";
import { useLists, useCreateList } from "@/hooks/useLists";
import { toast } from "sonner";

export default function ListsPage() {
  const { data, isLoading } = useLists();
  const createList = useCreateList();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    await createList.mutateAsync({ name: newName });
    setNewName("");
    setCreating(false);
    toast.success("List created");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lists</h1>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />New List</Button>
      </div>

      {creating && (
        <div className="flex gap-2 items-center p-3 bg-muted/50 rounded-md border">
          <input
            autoFocus
            placeholder="List name..."
            className="flex-1 bg-transparent text-sm outline-none"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
          />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : data?.data.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-primary" />
                        <span className="font-medium">{list.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{list.type}</Badge>
                    </div>
                    {list.description && <p className="text-sm text-muted-foreground truncate">{list.description}</p>}
                    <p className="text-xs text-muted-foreground mt-3">
                      {list._count?.contactMembers ?? 0} contacts · {list._count?.companyMembers ?? 0} companies
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {data?.data.length === 0 && !isLoading && (
        <div className="text-center py-20 text-muted-foreground">
          <List className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No lists yet. Create one to organize your prospects.</p>
        </div>
      )}
    </div>
  );
}
