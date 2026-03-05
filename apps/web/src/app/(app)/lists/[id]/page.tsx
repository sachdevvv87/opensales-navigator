"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Zap, List, Trash2 } from "lucide-react";
import { Button, Badge, Skeleton, Card, CardContent } from "@opensales/ui";
import { useList, useRefreshSmartList, useRemoveFromList } from "@/hooks/useLists";
import { toast } from "sonner";

function FilterConfigSummary({ config }: { config: Record<string, unknown> }) {
  const parts: string[] = [];

  if (Array.isArray(config.leadStage) && config.leadStage.length)
    parts.push(`Stage: ${(config.leadStage as string[]).join(", ")}`);
  if (Array.isArray(config.seniority) && config.seniority.length)
    parts.push(`Seniority: ${(config.seniority as string[]).join(", ")}`);
  if (Array.isArray(config.department) && config.department.length)
    parts.push(`Dept: ${(config.department as string[]).join(", ")}`);
  if (Array.isArray(config.locationCountry) && config.locationCountry.length)
    parts.push(`Country: ${(config.locationCountry as string[]).join(", ")}`);
  if (Array.isArray(config.tags) && config.tags.length)
    parts.push(`Tags: ${(config.tags as string[]).join(", ")}`);
  if (config.hasEmail === true) parts.push("Has Email: Yes");
  if (config.hasEmail === false) parts.push("Has Email: No");
  if (config.hasPhone === true) parts.push("Has Phone: Yes");
  if (config.hasPhone === false) parts.push("Has Phone: No");
  if (config.leadScoreMin !== undefined || config.leadScoreMax !== undefined)
    parts.push(`Score: ${config.leadScoreMin ?? 0}–${config.leadScoreMax ?? 100}`);

  if (!parts.length)
    return (
      <p className="text-sm text-muted-foreground italic">
        No filters configured — all contacts match.
      </p>
    );

  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((part) => (
        <span
          key={part}
          className="inline-block px-2.5 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200"
        >
          {part}
        </span>
      ))}
    </div>
  );
}

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: list, isLoading } = useList(id);
  const refresh = useRefreshSmartList(id);
  const removeContact = useRemoveFromList(id);

  const isSmart = list?.type === "SMART";

  async function handleRefresh() {
    try {
      const result = await refresh.mutateAsync();
      toast.success(result.message ?? `Refreshed: ${result.count} contacts matched`);
    } catch {
      toast.error("Failed to refresh smart list");
    }
  }

  async function handleRemove(contactId: string) {
    try {
      await removeContact.mutateAsync(contactId);
      toast.success("Contact removed from list");
    } catch {
      toast.error("Failed to remove contact");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/lists">
            <Button variant="ghost" size="sm" className="mt-0.5">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Lists
            </Button>
          </Link>
          <div>
            {isLoading ? (
              <Skeleton className="h-7 w-48 mb-1" />
            ) : (
              <div className="flex items-center gap-2">
                {isSmart ? (
                  <Zap className="w-5 h-5 text-amber-500" />
                ) : (
                  <List className="w-5 h-5 text-primary" />
                )}
                <h1 className="text-2xl font-bold">{list?.name}</h1>
                {isSmart ? (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                    Smart
                  </Badge>
                ) : (
                  <Badge variant="secondary">Static</Badge>
                )}
              </div>
            )}
            {isSmart && (
              <p className="text-sm text-muted-foreground ml-7">
                Auto-populated based on filter criteria
              </p>
            )}
            {list?.description && (
              <p className="text-sm text-muted-foreground ml-7 mt-0.5">{list.description}</p>
            )}
          </div>
        </div>

        {isSmart && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refresh.isPending}
            className="shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refresh.isPending ? "animate-spin" : ""}`}
            />
            {refresh.isPending ? "Refreshing..." : "Refresh"}
          </Button>
        )}
      </div>

      {/* Smart list filter summary */}
      {isSmart && list?.filterConfig && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Filter Configuration
            </p>
            <FilterConfigSummary config={list.filterConfig as Record<string, unknown>} />
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {!isLoading && list && (
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{list._count?.contactMembers ?? 0}</strong> contacts
          {(list._count?.companyMembers ?? 0) > 0 && (
            <>
              {" · "}
              <strong className="text-foreground">{list._count!.companyMembers}</strong> companies
            </>
          )}
        </p>
      )}

      {/* Contact list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : list?.contactMembers && list.contactMembers.length > 0 ? (
        <div className="space-y-2">
          {list.contactMembers.map(({ contact }) => (
            <Card key={contact.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="font-medium hover:underline hover:text-primary"
                  >
                    {contact.firstName} {contact.lastName}
                  </Link>
                  {contact.title && (
                    <p className="text-xs text-muted-foreground">{contact.title}</p>
                  )}
                  {contact.email && (
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  )}
                </div>
                {!isSmart && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(contact.id)}
                    disabled={removeContact.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          {isSmart ? (
            <>
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No contacts match your filters</p>
              <p className="text-sm mt-1">
                Adjust the filter criteria or click <strong>Refresh</strong> to re-evaluate.
              </p>
            </>
          ) : (
            <>
              <List className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No contacts in this list yet.</p>
              <p className="text-sm mt-1">Add contacts from the Contacts page.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
