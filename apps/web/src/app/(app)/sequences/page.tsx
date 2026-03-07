"use client";
import { useState } from "react";
import { Button } from "@opensales/ui";
import { Badge } from "@opensales/ui";
import { Input } from "@opensales/ui";
import { Label } from "@opensales/ui";
import { Skeleton } from "@opensales/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@opensales/ui";
import {
  Mail,
  Plus,
  Play,
  Pause,
  Trash2,
  Users,
  Clock,
  ChevronRight,
  GripVertical,
  X,
  MoreVertical,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@opensales/ui";
import {
  useSequences,
  useSequence,
  useCreateSequence,
  useUpdateSequence,
  useDeleteSequence,
  useSequenceEnrollments,
  type EmailSequence,
  type SequenceStep,
} from "@/hooks/useSequences";

// ── Types ──────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const ENROLLMENT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REPLIED: "bg-emerald-100 text-emerald-700",
  UNSUBSCRIBED: "bg-gray-100 text-gray-600",
  BOUNCED: "bg-red-100 text-red-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
};

// ── Step Editor ────────────────────────────────────────────────────────────────

interface StepDraft {
  order: number;
  subject: string;
  body: string;
  delayDays: number;
}

function StepEditor({
  steps,
  onChange,
}: {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
}) {
  function addStep() {
    const lastDelay = steps[steps.length - 1]?.delayDays ?? 0;
    onChange([
      ...steps,
      { order: steps.length + 1, subject: "", body: "", delayDays: lastDelay + 3 },
    ]);
  }

  function removeStep(i: number) {
    onChange(steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));
  }

  function updateStep(i: number, patch: Partial<StepDraft>) {
    onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="border border-border rounded-lg p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">
                {i + 1}
              </span>
              {i === 0 ? (
                <span className="text-xs text-muted-foreground">Send immediately</span>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Wait
                  <input
                    type="number"
                    min={0}
                    value={step.delayDays}
                    onChange={(e) => updateStep(i, { delayDays: Number(e.target.value) })}
                    className="w-12 border border-input rounded px-1 py-0.5 text-xs text-center bg-background"
                  />
                  days
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive"
              onClick={() => removeStep(i)}
              type="button"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <Input
            className="mb-2 text-sm"
            placeholder="Email subject..."
            value={step.subject}
            onChange={(e) => updateStep(i, { subject: e.target.value })}
          />
          <textarea
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground min-h-[80px]"
            placeholder={`Email body...\n\nUse {{firstName}}, {{lastName}}, {{fullName}} for personalization.`}
            value={step.body}
            onChange={(e) => updateStep(i, { body: e.target.value })}
          />
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addStep} type="button" className="w-full">
        <Plus className="w-4 h-4 mr-1" /> Add Step
      </Button>
    </div>
  );
}

// ── Create / Edit Sequence Dialog ──────────────────────────────────────────────

function SequenceFormDialog({
  open,
  onClose,
  sequence,
}: {
  open: boolean;
  onClose: () => void;
  sequence?: EmailSequence | null;
}) {
  const createSequence = useCreateSequence();
  const updateSequence = useUpdateSequence();

  const [name, setName] = useState(sequence?.name ?? "");
  const [description, setDescription] = useState(sequence?.description ?? "");
  const [steps, setSteps] = useState<StepDraft[]>(
    sequence?.steps?.length
      ? sequence.steps.map((s) => ({ ...s }))
      : [{ order: 1, subject: "", body: "", delayDays: 0 }]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, description: description || undefined, steps };
    if (sequence) {
      await updateSequence.mutateAsync({ id: sequence.id, ...payload });
    } else {
      await createSequence.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sequence ? "Edit Sequence" : "New Email Sequence"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Sequence Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cold Outreach Q1" required />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
          </div>
          <div>
            <Label className="mb-2 block">Steps</Label>
            <StepEditor steps={steps} onChange={setSteps} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createSequence.isPending || updateSequence.isPending}>
              {sequence ? "Save Changes" : "Create Sequence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Enrollments Dialog ─────────────────────────────────────────────────────────

function EnrollmentsDialog({
  sequenceId,
  open,
  onClose,
}: {
  sequenceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: enrollments = [], isLoading } = useSequenceEnrollments(sequenceId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enrolled Contacts</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : enrollments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No contacts enrolled yet.</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">
                    {e.contact.firstName} {e.contact.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.contact.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Step {e.currentStep}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ENROLLMENT_STATUS_STYLES[e.status]}`}>
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Sequence Card ──────────────────────────────────────────────────────────────

function SequenceCard({
  seq,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewEnrollments,
}: {
  seq: EmailSequence;
  onEdit: (s: EmailSequence) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
  onViewEnrollments: (id: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{seq.name}</h3>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_STYLES[seq.status]}`}>
              {seq.status}
            </span>
          </div>
          {seq.description && (
            <p className="text-xs text-muted-foreground truncate">{seq.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(seq)}>Edit</DropdownMenuItem>
            {seq.status === "ACTIVE" ? (
              <DropdownMenuItem onClick={() => onToggleStatus(seq.id, "PAUSED")}>
                <Pause className="w-3 h-3 mr-2" /> Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onToggleStatus(seq.id, "ACTIVE")}>
                <Play className="w-3 h-3 mr-2" /> Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(seq.id)}>
              <Trash2 className="w-3 h-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Steps preview */}
      <div className="mt-3 flex items-center gap-1 overflow-hidden">
        {seq.steps.slice(0, 5).map((step, i) => (
          <div key={i} className="flex items-center">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />}
            <div
              className="flex items-center gap-1 bg-muted rounded px-1.5 py-0.5 text-xs whitespace-nowrap"
              title={step.subject}
            >
              <Mail className="w-2.5 h-2.5" />
              {step.delayDays > 0 ? `+${step.delayDays}d` : "Day 0"}
            </div>
          </div>
        ))}
        {seq.steps.length > 5 && (
          <span className="text-xs text-muted-foreground ml-1">+{seq.steps.length - 5} more</span>
        )}
        {seq.steps.length === 0 && (
          <span className="text-xs text-muted-foreground">No steps yet</span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}
          </span>
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => onViewEnrollments(seq.id)}
          >
            <Users className="w-3 h-3" />
            {seq._count.enrollments} enrolled
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          by {seq.createdBy.name}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SequencesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: sequences = [], isLoading } = useSequences(statusFilter);
  const updateSequence = useUpdateSequence();
  const deleteSequence = useDeleteSequence();

  const [createOpen, setCreateOpen] = useState(false);
  const [editSequence, setEditSequence] = useState<EmailSequence | null>(null);
  const [enrollmentsId, setEnrollmentsId] = useState<string | null>(null);

  const statuses = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"];
  const activeCount = sequences.filter((s) => s.status === "ACTIVE").length;
  const totalEnrolled = sequences.reduce((sum, s) => sum + s._count.enrollments, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Sequences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sequences.length} sequences · {activeCount} active · {totalEnrolled} contacts enrolled
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Sequence
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(undefined)}
        >
          All
        </Button>
        {statuses.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s === statusFilter ? undefined : s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Mail className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">No sequences yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create automated email cadences to engage your prospects.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create First Sequence
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              seq={seq}
              onEdit={setEditSequence}
              onDelete={(id) => deleteSequence.mutate(id)}
              onToggleStatus={(id, status) => updateSequence.mutate({ id, status })}
              onViewEnrollments={setEnrollmentsId}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <SequenceFormDialog
        open={createOpen || !!editSequence}
        onClose={() => { setCreateOpen(false); setEditSequence(null); }}
        sequence={editSequence}
      />
      {enrollmentsId && (
        <EnrollmentsDialog
          sequenceId={enrollmentsId}
          open={!!enrollmentsId}
          onClose={() => setEnrollmentsId(null)}
        />
      )}
    </div>
  );
}
