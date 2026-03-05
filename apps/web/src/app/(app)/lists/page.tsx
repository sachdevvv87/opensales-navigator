"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, List, Zap } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@opensales/ui";
import { useLists, useCreateList } from "@/hooks/useLists";
import { SmartListBuilder } from "@/components/lists/SmartListBuilder";
import { toast } from "sonner";

type ListType = "STATIC" | "SMART";

export default function ListsPage() {
  const { data, isLoading } = useLists();
  const createList = useCreateList();

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [listType, setListType] = useState<ListType>("STATIC");
  const [filterConfig, setFilterConfig] = useState<Record<string, unknown>>({});

  function resetForm() {
    setNewName("");
    setNewDesc("");
    setListType("STATIC");
    setFilterConfig({});
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await createList.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        type: listType,
        filterConfig: listType === "SMART" ? filterConfig : undefined,
      });
      toast.success(`${listType === "SMART" ? "Smart list" : "List"} created`);
      setOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to create list");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lists</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                autoFocus
                placeholder="e.g. Q1 Enterprise Targets"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="list-desc">Description (optional)</Label>
              <Input
                id="list-desc"
                placeholder="What is this list for?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>List Type</Label>
              <div className="flex gap-2">
                {(["STATIC", "SMART"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setListType(t)}
                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
                      listType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {t === "SMART" ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Smart
                      </span>
                    ) : (
                      "Static"
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {listType === "SMART"
                  ? "Smart lists auto-populate based on filter criteria you define."
                  : "Static lists let you manually add and remove contacts."}
              </p>
            </div>

            {listType === "SMART" && (
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Filter Configuration
                </p>
                <SmartListBuilder value={filterConfig} onChange={setFilterConfig} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createList.isPending}
            >
              {createList.isPending ? "Creating..." : "Create List"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : data?.data.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {list.type === "SMART" ? (
                          <Zap className="w-4 h-4 text-amber-500" />
                        ) : (
                          <List className="w-4 h-4 text-primary" />
                        )}
                        <span className="font-medium truncate max-w-[160px]">{list.name}</span>
                      </div>
                      {list.type === "SMART" ? (
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                          Smart
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Static
                        </Badge>
                      )}
                    </div>
                    {list.description && (
                      <p className="text-sm text-muted-foreground truncate">{list.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                      {list._count?.contactMembers ?? 0} contacts
                      {(list._count?.companyMembers ?? 0) > 0 &&
                        ` · ${list._count!.companyMembers} companies`}
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
