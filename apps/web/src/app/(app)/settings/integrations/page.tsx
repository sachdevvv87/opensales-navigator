"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
  Separator,
} from "@opensales/ui";
import { X, Upload, CheckCircle2, Circle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IcpSettings {
  targetTitles: string[];
  targetSeniorities: string[];
  targetIndustries: string[];
  targetCompanySizes: string[];
  targetLocations: string[];
}

interface IntegrationStatus {
  apollo: boolean;
  hunter: boolean;
  clearbit: boolean;
}

interface ApiKeyState {
  value: string;
  saving: boolean;
  testing: boolean;
  status: "connected" | "not_configured" | "error" | "unknown";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SENIORITY_OPTIONS = [
  "C-Suite",
  "VP",
  "Director",
  "Manager",
  "Individual Contributor",
  "Entry Level",
];

const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

// ─── TagInput component ───────────────────────────────────────────────────────

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onAdd(trimmed);
    setInputValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="shrink-0">
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CheckboxGroup component ──────────────────────────────────────────────────

function ToggleGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors ${
              isSelected
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {isSelected ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
            {option}
          </button>
        );
      })}
    </div>
  );
}

// ─── StatusBadge component ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApiKeyState["status"] }) {
  if (status === "connected") {
    return (
      <Badge variant="success" className="flex items-center gap-1 w-fit">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
        <X className="w-3 h-3" />
        Invalid key
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="w-fit text-muted-foreground">
      Not configured
    </Badge>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  title,
  description,
  pricingNote,
  getKeyUrl,
  getKeyLabel,
  provider,
  keyState,
  onKeyChange,
  onSave,
  onTest,
}: {
  title: string;
  description: string;
  pricingNote: string;
  getKeyUrl: string;
  getKeyLabel: string;
  provider: string;
  keyState: ApiKeyState;
  onKeyChange: (val: string) => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            <p className="text-xs text-muted-foreground">{pricingNote}</p>
          </div>
          <StatusBadge status={keyState.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`apikey-${provider}`}>API Key</Label>
            <a
              href={getKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              {getKeyLabel}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <Input
            id={`apikey-${provider}`}
            type="password"
            placeholder={
              provider === "apollo"
                ? "ap0_..."
                : provider === "hunter"
                ? "Enter your Hunter.io API key..."
                : "Enter your Clearbit API key..."
            }
            value={keyState.value}
            onChange={(e) => onKeyChange(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSave}
            disabled={keyState.saving || !keyState.value.trim()}
          >
            {keyState.saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onTest}
            disabled={keyState.testing || !keyState.value.trim()}
          >
            {keyState.testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Testing…
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ICP state
  const [icp, setIcp] = useState<IcpSettings>({
    targetTitles: [],
    targetSeniorities: [],
    targetIndustries: [],
    targetCompanySizes: [],
    targetLocations: [],
  });
  const [icpSaving, setIcpSaving] = useState(false);
  const [icpLoading, setIcpLoading] = useState(true);

  // Integration key states
  const [integrations, setIntegrations] = useState<
    Record<"apollo" | "hunter" | "clearbit", ApiKeyState>
  >({
    apollo: { value: "", saving: false, testing: false, status: "unknown" },
    hunter: { value: "", saving: false, testing: false, status: "unknown" },
    clearbit: { value: "", saving: false, testing: false, status: "unknown" },
  });

  // ── Load current settings on mount ──────────────────────────────────────────

  useEffect(() => {
    async function loadSettings() {
      try {
        const [statusRes, settingsRes] = await Promise.allSettled([
          api.get<IntegrationStatus>("/enrichment/status"),
          api.get<{ settings: { icp?: Partial<IcpSettings> } }>("/admin/settings"),
        ]);

        if (statusRes.status === "fulfilled") {
          const s = statusRes.value.data;
          setIntegrations((prev) => ({
            apollo: {
              ...prev.apollo,
              status: s.apollo ? "connected" : "not_configured",
            },
            hunter: {
              ...prev.hunter,
              status: s.hunter ? "connected" : "not_configured",
            },
            clearbit: {
              ...prev.clearbit,
              status: s.clearbit ? "connected" : "not_configured",
            },
          }));
        }

        if (settingsRes.status === "fulfilled") {
          const savedIcp = settingsRes.value.data?.settings?.icp;
          if (savedIcp) {
            setIcp((prev) => ({
              targetTitles: savedIcp.targetTitles ?? prev.targetTitles,
              targetSeniorities: savedIcp.targetSeniorities ?? prev.targetSeniorities,
              targetIndustries: savedIcp.targetIndustries ?? prev.targetIndustries,
              targetCompanySizes: savedIcp.targetCompanySizes ?? prev.targetCompanySizes,
              targetLocations: savedIcp.targetLocations ?? prev.targetLocations,
            }));
          }
        }
      } catch {
        // Non-critical; continue with defaults
      } finally {
        setIcpLoading(false);
      }
    }

    loadSettings();
  }, []);

  // ── ICP helpers ───────────────────────────────────────────────────────────────

  function addIcpTag(field: keyof IcpSettings, value: string) {
    setIcp((prev) => ({
      ...prev,
      [field]: [...prev[field], value],
    }));
  }

  function removeIcpTag(field: keyof IcpSettings, value: string) {
    setIcp((prev) => ({
      ...prev,
      [field]: prev[field].filter((v) => v !== value),
    }));
  }

  function toggleIcpOption(field: "targetSeniorities" | "targetCompanySizes", option: string) {
    setIcp((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(option)
          ? current.filter((v) => v !== option)
          : [...current, option],
      };
    });
  }

  async function saveIcp() {
    setIcpSaving(true);
    try {
      await api.patch("/admin/settings", { icp });
      toast.success("ICP settings saved");
    } catch {
      toast.error("Failed to save ICP settings");
    } finally {
      setIcpSaving(false);
    }
  }

  // ── Integration key helpers ───────────────────────────────────────────────────

  function setKeyField(
    provider: "apollo" | "hunter" | "clearbit",
    updates: Partial<ApiKeyState>
  ) {
    setIntegrations((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...updates },
    }));
  }

  async function saveApiKey(provider: "apollo" | "hunter" | "clearbit") {
    const key = integrations[provider].value.trim();
    if (!key) return;
    setKeyField(provider, { saving: true });
    try {
      await api.patch("/admin/settings", { apiKeys: { [provider]: key } });
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved`);
    } catch {
      toast.error(`Failed to save ${provider} API key`);
    } finally {
      setKeyField(provider, { saving: false });
    }
  }

  async function testConnection(provider: "apollo" | "hunter" | "clearbit") {
    const key = integrations[provider].value.trim();
    if (!key) return;
    setKeyField(provider, { testing: true });
    try {
      await api.post("/admin/settings/test-integration", { provider, apiKey: key });
      setKeyField(provider, { status: "connected", testing: false });
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} connection successful`);
    } catch {
      setKeyField(provider, { status: "error", testing: false });
      toast.error(`Could not connect to ${provider}. Check your API key.`);
    }
  }

  // ── LinkedIn CSV upload ───────────────────────────────────────────────────────

  function handleLinkedInUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Redirect to contacts with import param; the contacts page or a modal can handle the actual upload
    router.push(`/contacts?import=linkedin&filename=${encodeURIComponent(file.name)}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Configure API keys, import contacts, and define your ideal customer profile.
        </p>
      </div>

      <Separator />

      {/* ── Section 1: LinkedIn Import ──────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Import LinkedIn Connections</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Export your LinkedIn connections as a CSV and upload them directly into OpenSales.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Go to{" "}
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  LinkedIn.com
                </a>{" "}
                → <strong className="text-foreground">Me</strong> →{" "}
                <strong className="text-foreground">Settings &amp; Privacy</strong>
              </li>
              <li>
                Click <strong className="text-foreground">Data Privacy</strong> →{" "}
                <strong className="text-foreground">Get a copy of your data</strong>
              </li>
              <li>
                Select <strong className="text-foreground">Connections</strong> → Request archive
              </li>
              <li>
                Download the CSV when ready, then upload it below
              </li>
            </ol>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleLinkedInUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload LinkedIn CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ── Section 2: Ideal Customer Profile ─────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Ideal Customer Profile</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define who you sell to. Used for Apollo prospecting and lead scoring.
          </p>
        </div>
        {icpLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Target Job Titles */}
              <div className="space-y-2">
                <Label>Target Job Titles</Label>
                <TagInput
                  tags={icp.targetTitles}
                  onAdd={(v) => addIcpTag("targetTitles", v)}
                  onRemove={(v) => removeIcpTag("targetTitles", v)}
                  placeholder="VP of Sales, Head of Marketing, CTO…"
                />
              </div>

              {/* Target Seniority Levels */}
              <div className="space-y-2">
                <Label>Target Seniority Levels</Label>
                <ToggleGroup
                  options={SENIORITY_OPTIONS}
                  selected={icp.targetSeniorities}
                  onToggle={(opt) => toggleIcpOption("targetSeniorities", opt)}
                />
              </div>

              {/* Target Industries */}
              <div className="space-y-2">
                <Label>Target Industries</Label>
                <TagInput
                  tags={icp.targetIndustries}
                  onAdd={(v) => addIcpTag("targetIndustries", v)}
                  onRemove={(v) => removeIcpTag("targetIndustries", v)}
                  placeholder="Software, Financial Services, Healthcare…"
                />
              </div>

              {/* Target Company Sizes */}
              <div className="space-y-2">
                <Label>Target Company Sizes</Label>
                <ToggleGroup
                  options={COMPANY_SIZE_OPTIONS}
                  selected={icp.targetCompanySizes}
                  onToggle={(opt) => toggleIcpOption("targetCompanySizes", opt)}
                />
              </div>

              {/* Target Locations */}
              <div className="space-y-2">
                <Label>Target Locations</Label>
                <TagInput
                  tags={icp.targetLocations}
                  onAdd={(v) => addIcpTag("targetLocations", v)}
                  onRemove={(v) => removeIcpTag("targetLocations", v)}
                  placeholder="United States, United Kingdom, Canada…"
                />
              </div>

              <Button onClick={saveIcp} disabled={icpSaving} className="w-full sm:w-auto">
                {icpSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving ICP…
                  </>
                ) : (
                  "Save ICP"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      {/* ── Section 3: Apollo.io ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Apollo.io</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Contact prospecting &amp; enrichment.
          </p>
        </div>
        <IntegrationCard
          title="Apollo.io (Contact Prospecting & Enrichment)"
          description="Find new prospects and enrich contact data automatically."
          pricingNote="Free tier: 50 exports/month. Paid plans from $49/month."
          getKeyUrl="https://app.apollo.io/#/settings/integrations/api"
          getKeyLabel="Get free Apollo API key"
          provider="apollo"
          keyState={integrations.apollo}
          onKeyChange={(v) => setKeyField("apollo", { value: v })}
          onSave={() => saveApiKey("apollo")}
          onTest={() => testConnection("apollo")}
        />
      </section>

      <Separator />

      {/* ── Section 4: Hunter.io ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Hunter.io</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Email finder &amp; verifier.
          </p>
        </div>
        <IntegrationCard
          title="Hunter.io (Email Finder)"
          description="Find professional email addresses for any contact."
          pricingNote="Free tier: 25 searches/month."
          getKeyUrl="https://hunter.io/api-keys"
          getKeyLabel="Get free Hunter API key"
          provider="hunter"
          keyState={integrations.hunter}
          onKeyChange={(v) => setKeyField("hunter", { value: v })}
          onSave={() => saveApiKey("hunter")}
          onTest={() => testConnection("hunter")}
        />
      </section>

      <Separator />

      {/* ── Section 5: Clearbit ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Clearbit</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Company enrichment.
          </p>
        </div>
        <IntegrationCard
          title="Clearbit (Company Enrichment)"
          description="Automatically enrich company profiles with industry, size, logo."
          pricingNote="Free for startups, paid plans available."
          getKeyUrl="https://dashboard.clearbit.com/api"
          getKeyLabel="Get free Clearbit API key"
          provider="clearbit"
          keyState={integrations.clearbit}
          onKeyChange={(v) => setKeyField("clearbit", { value: v })}
          onSave={() => saveApiKey("clearbit")}
          onTest={() => testConnection("clearbit")}
        />
      </section>
    </div>
  );
}
