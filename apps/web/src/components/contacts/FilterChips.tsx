"use client";
import { X } from "lucide-react";
import type { ContactsParams } from "@/hooks/useContacts";

interface FilterChipsProps {
  filters: ContactsParams;
  onChange: (filters: ContactsParams) => void;
}

interface Chip {
  label: string;
  onRemove: () => void;
}

export function FilterChips({ filters, onChange }: FilterChipsProps) {
  const chips: Chip[] = [];

  (filters.leadStage ?? []).forEach((stage) =>
    chips.push({
      label: `Stage: ${stage}`,
      onRemove: () =>
        onChange({ ...filters, leadStage: filters.leadStage?.filter((s) => s !== stage) }),
    })
  );

  (filters.seniority ?? []).forEach((level) =>
    chips.push({
      label: `Seniority: ${level}`,
      onRemove: () =>
        onChange({ ...filters, seniority: filters.seniority?.filter((s) => s !== level) }),
    })
  );

  (filters.department ?? []).forEach((dept) =>
    chips.push({
      label: `Dept: ${dept}`,
      onRemove: () =>
        onChange({ ...filters, department: filters.department?.filter((s) => s !== dept) }),
    })
  );

  (filters.locationCountry ?? []).forEach((country) =>
    chips.push({
      label: `Location: ${country}`,
      onRemove: () =>
        onChange({
          ...filters,
          locationCountry: filters.locationCountry?.filter((s) => s !== country),
        }),
    })
  );

  (filters.tags ?? []).forEach((tag) =>
    chips.push({
      label: `Tag: ${tag}`,
      onRemove: () =>
        onChange({ ...filters, tags: filters.tags?.filter((s) => s !== tag) }),
    })
  );

  if (filters.leadScoreMin !== undefined)
    chips.push({
      label: `Score ≥ ${filters.leadScoreMin}`,
      onRemove: () => onChange({ ...filters, leadScoreMin: undefined }),
    });

  if (filters.leadScoreMax !== undefined)
    chips.push({
      label: `Score ≤ ${filters.leadScoreMax}`,
      onRemove: () => onChange({ ...filters, leadScoreMax: undefined }),
    });

  if (filters.hasEmail !== undefined)
    chips.push({
      label: `Has Email: ${filters.hasEmail ? "Yes" : "No"}`,
      onRemove: () => onChange({ ...filters, hasEmail: undefined }),
    });

  if (filters.hasPhone !== undefined)
    chips.push({
      label: `Has Phone: ${filters.hasPhone ? "Yes" : "No"}`,
      onRemove: () => onChange({ ...filters, hasPhone: undefined }),
    });

  if (filters.createdAfter)
    chips.push({
      label: `After: ${filters.createdAfter}`,
      onRemove: () => onChange({ ...filters, createdAfter: undefined }),
    });

  if (filters.createdBefore)
    chips.push({
      label: `Before: ${filters.createdBefore}`,
      onRemove: () => onChange({ ...filters, createdBefore: undefined }),
    });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="ml-0.5 hover:text-primary/60 transition-colors"
            aria-label={`Remove ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
