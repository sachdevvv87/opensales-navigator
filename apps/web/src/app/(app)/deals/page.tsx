"use client";
import { useState, useRef } from "react";
import { Button } from "@opensales/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@opensales/ui";
import { Input } from "@opensales/ui";
import { Label } from "@opensales/ui";
import { Badge } from "@opensales/ui";
import { Skeleton } from "@opensales/ui";
import {
  Plus,
  DollarSign,
  Calendar,
  User,
  Building2,
  MoreVertical,
  Trash2,
  Trophy,
  X,
  Settings2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@opensales/ui";
import {
  useDealStages,
  useDeals,
  useCreateDeal,
  useUpdateDeal,
  useMoveDeal,
  useDeleteDeal,
  useCreateDealStage,
  useDeleteDealStage,
  type Deal,
  type DealStage,
  type CreateDealInput,
} from "@/hooks/useDeals";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null, currency = "USD") {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function stageTotal(deals: Deal[], stageId: string) {
  return deals
    .filter((d) => d.stageId === stageId && d.status === "OPEN")
    .reduce((sum, d) => sum + (d.value ?? 0), 0);
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

// ── Deal Card ──────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  stages,
  onMove,
  onEdit,
  onDelete,
}: {
  deal: Deal;
  stages: DealStage[];
  onMove: (id: string, stageId: string) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onEdit(deal)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight flex-1">{deal.name}</p>
        <div
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {stages
                .filter((s) => s.id !== deal.stageId)
                .map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => onMove(deal.id, s.id)}>
                    Move to {s.name}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(deal.id)}
              >
                <Trash2 className="w-3 h-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {deal.value !== null && (
        <div className="flex items-center gap-1 mt-2 text-emerald-600 font-semibold text-sm">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(deal.value, deal.currency)}
        </div>
      )}

      <div className="mt-2 space-y-1">
        {deal.contact && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            {deal.contact.firstName} {deal.contact.lastName}
          </div>
        )}
        {deal.company && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            {deal.company.name}
          </div>
        )}
        {deal.closeDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(deal.closeDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {deal.probability !== null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Probability</span>
            <span>{deal.probability}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full">
            <div
              className="h-1 bg-primary rounded-full transition-all"
              style={{ width: `${deal.probability}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[deal.status]}`}>
          {deal.status}
        </span>
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  stages,
  onAddDeal,
  onMove,
  onEdit,
  onDelete,
}: {
  stage: DealStage;
  deals: Deal[];
  stages: DealStage[];
  onAddDeal: (stageId: string) => void;
  onMove: (id: string, stageId: string) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
}) {
  const total = stageTotal(deals, stage.id);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-muted/40 rounded-xl border border-border">
      {/* Column header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="font-medium text-sm">{stage.name}</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              {deals.filter((d) => d.stageId === stage.id).length}
            </span>
          </div>
          {stage.isWon && <Trophy className="w-4 h-4 text-yellow-500" />}
        </div>
        {total > 0 && (
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {formatCurrency(total)} pipeline
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]">
        {deals
          .filter((d) => d.stageId === stage.id)
          .map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              stages={stages}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
      </div>

      {/* Add button */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => onAddDeal(stage.id)}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Deal
        </Button>
      </div>
    </div>
  );
}

// ── Deal Form Dialog ───────────────────────────────────────────────────────────

function DealFormDialog({
  open,
  onClose,
  stages,
  initialStageId,
  deal,
}: {
  open: boolean;
  onClose: () => void;
  stages: DealStage[];
  initialStageId?: string;
  deal?: Deal | null;
}) {
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();

  const [form, setForm] = useState<CreateDealInput>({
    name: deal?.name ?? "",
    value: deal?.value ?? undefined,
    currency: deal?.currency ?? "USD",
    stageId: deal?.stageId ?? initialStageId ?? stages[0]?.id ?? "",
    probability: deal?.probability ?? undefined,
    closeDate: deal?.closeDate ? deal.closeDate.split("T")[0] : "",
    notes: deal?.notes ?? "",
  });

  function field(k: keyof CreateDealInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      value: form.value ? Number(form.value) : undefined,
      probability: form.probability ? Number(form.probability) : undefined,
      closeDate: form.closeDate || undefined,
    };
    if (deal) {
      await updateDeal.mutateAsync({ id: deal.id, ...payload });
    } else {
      await createDeal.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{deal ? "Edit Deal" : "New Deal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Deal Name *</Label>
            <Input value={form.name} onChange={field("name")} placeholder="e.g. Acme Corp Enterprise" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Value</Label>
              <Input type="number" value={form.value ?? ""} onChange={field("value")} placeholder="0" min={0} />
            </div>
            <div>
              <Label>Currency</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.currency}
                onChange={field("currency")}
              >
                {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Stage *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={form.stageId}
              onChange={field("stageId")}
              required
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Probability (%)</Label>
              <Input
                type="number"
                value={form.probability ?? ""}
                onChange={field("probability")}
                placeholder="0–100"
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label>Close Date</Label>
              <Input type="date" value={form.closeDate ?? ""} onChange={field("closeDate")} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
              value={form.notes ?? ""}
              onChange={field("notes")}
              placeholder="Additional notes..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={createDeal.isPending || updateDeal.isPending}
            >
              {deal ? "Save Changes" : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Stage Manager Dialog ───────────────────────────────────────────────────────

function StageManagerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: stages = [] } = useDealStages();
  const createStage = useCreateDealStage();
  const deleteStage = useDeleteDealStage();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  async function handleAdd() {
    if (!newName.trim()) return;
    await createStage.mutateAsync({ name: newName.trim(), color: newColor });
    setNewName("");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Pipeline Stages</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-sm">{s.name}</span>
              {s.isWon && <Trophy className="w-3 h-3 text-yellow-500" />}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive"
                onClick={() => deleteStage.mutate(s.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-9 rounded border border-input cursor-pointer"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New stage name..."
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={createStage.isPending}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const { data: stages = [], isLoading: stagesLoading } = useDealStages();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const moveDeal = useMoveDeal();
  const deleteDeal = useDeleteDeal();

  const [createOpen, setCreateOpen] = useState(false);
  const [createStageId, setCreateStageId] = useState<string>("");
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [stageManagerOpen, setStageManagerOpen] = useState(false);

  function openCreateInStage(stageId: string) {
    setCreateStageId(stageId);
    setCreateOpen(true);
  }

  // Summary stats
  const openDeals = deals.filter((d) => d.status === "OPEN");
  const wonDeals = deals.filter((d) => d.status === "WON");
  const totalPipeline = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const totalWon = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);

  if (stagesLoading || dealsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 w-72" />)}
        </div>
      </div>
    );
  }

  // Bootstrap default stages if none exist
  const displayStages = stages.length > 0 ? stages : [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Deal Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {openDeals.length} open deals · {formatCurrency(totalPipeline)} pipeline ·{" "}
            <span className="text-emerald-600 font-medium">{formatCurrency(totalWon)} won</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStageManagerOpen(true)}>
            <Settings2 className="w-4 h-4 mr-1" /> Stages
          </Button>
          <Button onClick={() => { setCreateStageId(displayStages[0]?.id ?? ""); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Deal
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      {displayStages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No pipeline stages yet.</p>
            <Button onClick={() => setStageManagerOpen(true)}>
              <Settings2 className="w-4 h-4 mr-1" /> Set up Pipeline
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
          {displayStages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={deals}
              stages={displayStages}
              onAddDeal={openCreateInStage}
              onMove={(id, sid) => moveDeal.mutate({ id, stageId: sid })}
              onEdit={setEditDeal}
              onDelete={(id) => deleteDeal.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {(createOpen || editDeal) && (
        <DealFormDialog
          open={createOpen || !!editDeal}
          onClose={() => { setCreateOpen(false); setEditDeal(null); }}
          stages={displayStages}
          initialStageId={createStageId}
          deal={editDeal}
        />
      )}
      <StageManagerDialog open={stageManagerOpen} onClose={() => setStageManagerOpen(false)} />
    </div>
  );
}
