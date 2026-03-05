"use client";
import React, { useState, useEffect } from "react";
import { Eye, EyeOff, X, Search, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@opensales/ui";
import {
  useSaveApiKeys,
  useSaveIcp,
  useProspect,
  useImportProspects,
  useOrgSettings,
  useEnrichmentStatus,
  type IcpConfig,
  type ProspectResult,
} from "@/hooks/useEnrichment";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENIORITY_OPTIONS = [
  { value: "C_SUITE", label: "C-Suite" },
  { value: "VP", label: "VP" },
  { value: "DIRECTOR", label: "Director" },
  { value: "MANAGER", label: "Manager" },
  { value: "IC", label: "IC" },
  { value: "ENTRY", label: "Entry" },
];

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-500", label: "201–500" },
  { value: "501-1000", label: "501–1000" },
  { value: "1000+", label: "1000+" },
];

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/,$/, "");
      if (newTag && !tags.includes(newTag)) onChange([...tags, newTag]);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 min-h-[42px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="rounded-full hover:bg-muted p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
      />
    </div>
  );
}

// ── ApiKeyCard ────────────────────────────────────────────────────────────────

function ApiKeyCard({
  provider,
  name,
  description,
  isConfigured,
  onSave,
  isSaving,
}: {
  provider: string;
  name: string;
  description: string;
  isConfigured: boolean;
  onSave: (key: string) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState("");
  const [showKey, setShowKey] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{name}</CardTitle>
          {isConfigured ? (
            <Badge variant="success" className="text-xs shrink-0">Connected</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs shrink-0">Not configured</Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={isConfigured ? "Enter new key to update" : "Paste API key…"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            size="sm"
            disabled={!value.trim() || isSaving}
            onClick={() => {
              onSave(value.trim());
              setValue("");
            }}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── ProspectFinderDialog ──────────────────────────────────────────────────────

function ProspectFinderDialog({
  icp,
  apolloConfigured,
}: {
  icp: IcpConfig;
  apolloConfigured: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [importSuccess, setImportSuccess] = useState<{ created: number; skipped: number } | null>(null);

  const { mutate: searchProspects, data: prospectData, isPending: isSearching, reset: resetSearch } = useProspect();
  const { mutate: importProspects, isPending: isImporting } = useImportProspects();

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedIdxs(new Set());
      setImportSuccess(null);
      setPage(1);
      resetSearch();
    }
  }

  function handleSearch(p = page) {
    setSelectedIdxs(new Set());
    searchProspects({ icp, page: p });
  }

  function handleImport() {
    const results = prospectData?.results ?? [];
    const toImport = results.filter((_, i) => selectedIdxs.has(i));
    importProspects(toImport, {
      onSuccess: (data) => {
        setImportSuccess({ created: data.created, skipped: data.skipped });
        setSelectedIdxs(new Set());
        toast.success(`Imported ${data.created} contact${data.created !== 1 ? "s" : ""}`);
      },
      onError: () => toast.error("Import failed. Please try again."),
    });
  }

  const results = prospectData?.results ?? [];
  const allSelected = results.length > 0 && selectedIdxs.size === results.length;

  const icpSummary = () => {
    const parts: string[] = [];
    if (icp.titles?.length) parts.push(`Titles: ${icp.titles.slice(0, 3).join(", ")}${icp.titles.length > 3 ? "…" : ""}`);
    if (icp.seniorities?.length) parts.push(`Seniority: ${icp.seniorities.join(", ")}`);
    if (icp.industries?.length) parts.push(`Industries: ${icp.industries.slice(0, 2).join(", ")}${icp.industries.length > 2 ? "…" : ""}`);
    if (icp.companySizes?.length) parts.push(`Sizes: ${icp.companySizes.join(", ")}`);
    if (icp.locations?.length) parts.push(`Locations: ${icp.locations.slice(0, 2).join(", ")}${icp.locations.length > 2 ? "…" : ""}`);
    return parts.length ? parts : ["No ICP configured — results may be broad."];
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Search className="h-4 w-4" />
          Find Prospects
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prospect Finder</DialogTitle>
        </DialogHeader>

        {!apolloConfigured ? (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="text-sm">Configure your Apollo API key above to use the prospect finder.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ICP Summary */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">ICP Summary</p>
              <ul className="space-y-1">
                {icpSummary().map((line) => (
                  <li key={line} className="text-sm">{line}</li>
                ))}
              </ul>
            </div>

            {/* Search button */}
            <div className="flex items-center gap-3">
              <Button onClick={() => handleSearch()} disabled={isSearching} className="gap-2">
                {isSearching ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Apollo
                  </>
                )}
              </Button>
              {prospectData && (
                <span className="text-sm text-muted-foreground">
                  {prospectData.total.toLocaleString()} total · page {prospectData.page}
                </span>
              )}
            </div>

            {/* Success banner */}
            {importSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
                Imported <strong>{importSuccess.created}</strong> contact{importSuccess.created !== 1 ? "s" : ""}.
                {importSuccess.skipped > 0 && ` (${importSuccess.skipped} already in CRM)`}
              </div>
            )}

            {/* Results table */}
            {results.length > 0 && (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() =>
                              setSelectedIdxs(
                                allSelected ? new Set() : new Set(results.map((_, i) => i))
                              )
                            }
                            className="h-4 w-4 rounded accent-primary cursor-pointer"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((prospect: ProspectResult, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIdxs.has(idx)}
                              onChange={() =>
                                setSelectedIdxs((prev) => {
                                  const next = new Set(prev);
                                  next.has(idx) ? next.delete(idx) : next.add(idx);
                                  return next;
                                })
                              }
                              disabled={prospect.alreadyInCrm}
                              className="h-4 w-4 rounded accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {prospect.firstName} {prospect.lastName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                            {prospect.title ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">
                            {prospect.companyName ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {[prospect.locationCity, prospect.locationCountry].filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate">
                            {prospect.email ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {prospect.alreadyInCrm ? (
                              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                Already in CRM
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-xs">Import</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination + import */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isSearching}
                      onClick={() => {
                        const p = page - 1;
                        setPage(p);
                        handleSearch(p);
                      }}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSearching}
                      onClick={() => {
                        const p = page + 1;
                        setPage(p);
                        handleSearch(p);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                  <Button
                    disabled={selectedIdxs.size === 0 || isImporting}
                    onClick={handleImport}
                    className="gap-2"
                  >
                    {isImporting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Importing…
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Import Selected ({selectedIdxs.size})
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── ICP Form ──────────────────────────────────────────────────────────────────

function IcpForm({ initialIcp }: { initialIcp: IcpConfig }) {
  const [icp, setIcp] = useState<IcpConfig>(initialIcp);
  const { mutate: saveIcp, isPending } = useSaveIcp();

  useEffect(() => {
    setIcp(initialIcp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialIcp)]);

  function toggleSeniority(value: string) {
    const current = icp.seniorities ?? [];
    setIcp({
      ...icp,
      seniorities: current.includes(value)
        ? current.filter((s) => s !== value)
        : [...current, value],
    });
  }

  function toggleCompanySize(value: string) {
    const current = icp.companySizes ?? [];
    setIcp({
      ...icp,
      companySizes: current.includes(value)
        ? current.filter((s) => s !== value)
        : [...current, value],
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ideal Customer Profile (ICP)</CardTitle>
        <CardDescription>
          Define your target audience. Used by the Prospect Finder to search Apollo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>Target Job Titles</Label>
          <TagInput
            tags={icp.titles ?? []}
            onChange={(titles) => setIcp({ ...icp, titles })}
            placeholder="Type a title and press Enter…"
          />
          <p className="text-xs text-muted-foreground">e.g. "VP of Sales", "Head of Marketing"</p>
        </div>

        <div className="space-y-1.5">
          <Label>Target Seniorities</Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {SENIORITY_OPTIONS.map(({ value, label }) => {
              const active = (icp.seniorities ?? []).includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSeniority(value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-input hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Target Industries</Label>
          <TagInput
            tags={icp.industries ?? []}
            onChange={(industries) => setIcp({ ...icp, industries })}
            placeholder="Type an industry and press Enter…"
          />
          <p className="text-xs text-muted-foreground">e.g. "SaaS", "FinTech", "Healthcare"</p>
        </div>

        <div className="space-y-1.5">
          <Label>Company Size Ranges</Label>
          <div className="flex flex-wrap gap-4 pt-1">
            {COMPANY_SIZE_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={(icp.companySizes ?? []).includes(value)}
                  onChange={() => toggleCompanySize(value)}
                  className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Target Locations</Label>
          <TagInput
            tags={icp.locations ?? []}
            onChange={(locations) => setIcp({ ...icp, locations })}
            placeholder="Type a location and press Enter…"
          />
          <p className="text-xs text-muted-foreground">e.g. "United States", "London", "Germany"</p>
        </div>

        <Button
          onClick={() =>
            saveIcp(icp, {
              onSuccess: () => toast.success("ICP configuration saved"),
              onError: () => toast.error("Failed to save ICP configuration"),
            })
          }
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save ICP"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { data: orgData, isLoading: orgLoading } = useOrgSettings();
  const { data: enrichmentStatus } = useEnrichmentStatus();
  const { mutate: saveApiKeys, isPending: isSavingKeys } = useSaveApiKeys();
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  const icp: IcpConfig = (orgData?.settings?.icp as IcpConfig) ?? {};

  function handleSaveApiKey(provider: "apollo" | "hunter" | "clearbit", key: string) {
    setSavingProvider(provider);
    saveApiKeys(
      { [provider]: key },
      {
        onSuccess: () => {
          toast.success(`${provider} API key saved`);
          setSavingProvider(null);
        },
        onError: () => {
          toast.error(`Failed to save ${provider} API key`);
          setSavingProvider(null);
        },
      }
    );
  }

  const enrichmentProviders: Array<{
    provider: "apollo" | "hunter" | "clearbit";
    name: string;
    description: string;
  }> = [
    { provider: "apollo", name: "Apollo.io", description: "Full contact & company enrichment, plus prospect search." },
    { provider: "hunter", name: "Hunter.io", description: "Find and verify professional email addresses." },
    { provider: "clearbit", name: "Clearbit", description: "Enrich company profiles with firmographic data." },
  ];

  const crmProviders = [
    { name: "HubSpot", description: "Two-way contact & company sync" },
    { name: "Salesforce", description: "Sync leads, contacts, and opportunities" },
    { name: "Pipedrive", description: "Sync contacts and deals" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect enrichment providers and configure your Ideal Customer Profile.
        </p>
      </div>

      {/* API Keys */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Keys are stored securely and never exposed to the frontend.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {enrichmentProviders.map(({ provider, name, description }) => (
            <ApiKeyCard
              key={provider}
              provider={provider}
              name={name}
              description={description}
              isConfigured={enrichmentStatus?.[provider] ?? false}
              onSave={(key) => handleSaveApiKey(provider, key)}
              isSaving={savingProvider === provider && isSavingKeys}
            />
          ))}
          {crmProviders.map(({ name, description }) => (
            <Card key={name} className="opacity-60">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{name}</CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0">Coming Soon</Badge>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* ICP Configuration */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">ICP Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Define your Ideal Customer Profile to power the Prospect Finder.
          </p>
        </div>
        {orgLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Loading settings…
            </CardContent>
          </Card>
        ) : (
          <IcpForm initialIcp={icp} />
        )}
      </section>

      {/* Prospect Finder */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Prospect Finder</h2>
          <p className="text-sm text-muted-foreground">
            Search Apollo for contacts matching your ICP and import them into your CRM.
          </p>
        </div>
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Search &amp; import prospects</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Uses your Apollo API key and ICP configuration to find matching contacts.
                </p>
              </div>
              <ProspectFinderDialog
                icp={icp}
                apolloConfigured={enrichmentStatus?.apollo ?? false}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
