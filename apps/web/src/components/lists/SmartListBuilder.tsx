"use client";
import { useState } from "react";
import { Input } from "@opensales/ui";

interface SmartListBuilderProps {
  value: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const LEAD_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
const SENIORITY_LEVELS = ["C_SUITE", "VP", "DIRECTOR", "MANAGER", "IC", "ENTRY"];

function ChipGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            selected.includes(opt)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
          }`}
        >
          {opt.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}

function ToggleGroup({
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
    <div className="flex gap-1">
      {opts.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
            value === opt.val
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ArrayInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState("");

  function add() {
    const trimmed = inputVal.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInputVal("");
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 border border-border font-medium"
        >
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="hover:text-destructive font-bold leading-none"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SmartListBuilder({ value, onChange }: SmartListBuilderProps) {
  function set(key: string, val: unknown) {
    onChange({ ...value, [key]: val });
  }

  const getArr = (key: string): string[] =>
    Array.isArray(value[key]) ? (value[key] as string[]) : [];

  const getBool = (key: string): boolean | undefined => {
    const v = value[key];
    if (v === true) return true;
    if (v === false) return false;
    return undefined;
  };

  const getNum = (key: string): number | undefined =>
    typeof value[key] === "number" ? (value[key] as number) : undefined;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Lead Stage
        </label>
        <ChipGroup
          options={LEAD_STAGES}
          selected={getArr("leadStage")}
          onChange={(v) => set("leadStage", v.length ? v : undefined)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Seniority
        </label>
        <ChipGroup
          options={SENIORITY_LEVELS}
          selected={getArr("seniority")}
          onChange={(v) => set("seniority", v.length ? v : undefined)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Department
        </label>
        <ArrayInput
          value={getArr("department")}
          onChange={(v) => set("department", v.length ? v : undefined)}
          placeholder="e.g. Engineering, Sales..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Location / Country
        </label>
        <ArrayInput
          value={getArr("locationCountry")}
          onChange={(v) => set("locationCountry", v.length ? v : undefined)}
          placeholder="e.g. United States, Germany..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Has Email
          </label>
          <ToggleGroup value={getBool("hasEmail")} onChange={(v) => set("hasEmail", v)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Has Phone
          </label>
          <ToggleGroup value={getBool("hasPhone")} onChange={(v) => set("hasPhone", v)} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Tags
        </label>
        <ArrayInput
          value={getArr("tags")}
          onChange={(v) => set("tags", v.length ? v : undefined)}
          placeholder="e.g. hot-lead, churned..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Lead Score Range
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="Min"
            className="h-8 text-sm w-24"
            value={getNum("leadScoreMin") ?? ""}
            onChange={(e) =>
              set("leadScoreMin", e.target.value !== "" ? Number(e.target.value) : undefined)
            }
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="Max"
            className="h-8 text-sm w-24"
            value={getNum("leadScoreMax") ?? ""}
            onChange={(e) =>
              set("leadScoreMax", e.target.value !== "" ? Number(e.target.value) : undefined)
            }
          />
        </div>
      </div>
    </div>
  );
}
