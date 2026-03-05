"use client";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@opensales/ui";
import type { ContactsParams } from "@/hooks/useContacts";

const LEAD_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
const SENIORITY_LEVELS = ["C_SUITE", "VP", "DIRECTOR", "MANAGER", "IC", "ENTRY"];

interface FilterPanelProps {
  filters: ContactsParams;
  onChange: (filters: ContactsParams) => void;
}

function toggleArrayItem(arr: string[] | undefined, item: string): string[] {
  const current = arr ?? [];
  return current.includes(item) ? current.filter((v) => v !== item) : [...current, item];
}

function parseTagInput(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function countActiveFilters(filters: ContactsParams): number {
  let count = 0;
  if (filters.leadStage?.length) count++;
  if (filters.seniority?.length) count++;
  if (filters.department?.length) count++;
  if (filters.locationCountry?.length) count++;
  if (filters.tags?.length) count++;
  if (filters.leadScoreMin !== undefined) count++;
  if (filters.leadScoreMax !== undefined) count++;
  if (filters.hasEmail !== undefined) count++;
  if (filters.hasPhone !== undefined) count++;
  if (filters.createdAfter) count++;
  if (filters.createdBefore) count++;
  return count;
}

function BoolToggle({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
}) {
  const opts: Array<{ label: string; val: boolean | undefined }> = [
    { label: "Any", val: undefined },
    { label: "Yes", val: true },
    { label: "No", val: false },
  ];
  return (
    <div className="flex gap-1.5">
      {opts.map((opt) => {
        const active = value === opt.val;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(active ? undefined : opt.val)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-input hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContactsParams>(filters);
  const [departmentInput, setDepartmentInput] = useState(
    (filters.department ?? []).join(", ")
  );
  const [locationInput, setLocationInput] = useState(
    (filters.locationCountry ?? []).join(", ")
  );
  const [tagsInput, setTagsInput] = useState((filters.tags ?? []).join(", "));

  const activeCount = countActiveFilters(filters);

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      setDraft(filters);
      setDepartmentInput((filters.department ?? []).join(", "));
      setLocationInput((filters.locationCountry ?? []).join(", "));
      setTagsInput((filters.tags ?? []).join(", "));
    }
    setOpen(isOpen);
  }

  function handleApply() {
    const dept = parseTagInput(departmentInput);
    const loc = parseTagInput(locationInput);
    const tags = parseTagInput(tagsInput);
    const next: ContactsParams = { ...draft };
    if (dept.length) next.department = dept; else delete next.department;
    if (loc.length) next.locationCountry = loc; else delete next.locationCountry;
    if (tags.length) next.tags = tags; else delete next.tags;
    onChange(next);
    setOpen(false);
  }

  function handleClear() {
    setDraft({});
    setDepartmentInput("");
    setLocationInput("");
    setTagsInput("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Contacts</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Lead Stage */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Lead Stage</p>
            <div className="flex flex-wrap gap-2">
              {LEAD_STAGES.map((stage) => {
                const active = (draft.leadStage ?? []).includes(stage);
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, leadStage: toggleArrayItem(d.leadStage, stage) }))
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-input hover:bg-muted"
                    }`}
                  >
                    {stage}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seniority */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Seniority</p>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_LEVELS.map((level) => {
                const active = (draft.seniority ?? []).includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, seniority: toggleArrayItem(d.seniority, level) }))
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-input hover:bg-muted"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Department</p>
            <Input
              placeholder="e.g. Engineering, Sales (comma separated)"
              value={departmentInput}
              onChange={(e) => setDepartmentInput(e.target.value)}
              onBlur={(e) => setDepartmentInput(parseTagInput(e.target.value).join(", "))}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Location / Country</p>
            <Input
              placeholder="e.g. United States, Germany (comma separated)"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onBlur={(e) => setLocationInput(parseTagInput(e.target.value).join(", "))}
            />
          </div>

          {/* Lead Score */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Lead Score</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Min"
                className="w-24"
                value={draft.leadScoreMin ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    leadScoreMin: e.target.value !== "" ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Max"
                className="w-24"
                value={draft.leadScoreMax ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    leadScoreMax: e.target.value !== "" ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          {/* Has Email */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Has Email</p>
            <BoolToggle
              value={draft.hasEmail}
              onChange={(v) => setDraft((d) => ({ ...d, hasEmail: v }))}
            />
          </div>

          {/* Has Phone */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Has Phone</p>
            <BoolToggle
              value={draft.hasPhone}
              onChange={(v) => setDraft((d) => ({ ...d, hasPhone: v }))}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Tags</p>
            <Input
              placeholder="e.g. hot-lead, enterprise (comma separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={(e) => setTagsInput(parseTagInput(e.target.value).join(", "))}
            />
          </div>

          {/* Created Date */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Created Date</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">After</label>
                <Input
                  type="date"
                  value={draft.createdAfter ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, createdAfter: e.target.value || undefined }))
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Before</label>
                <Input
                  type="date"
                  value={draft.createdBefore ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, createdBefore: e.target.value || undefined }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
