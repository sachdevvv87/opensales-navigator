"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Phone, Mail, Linkedin, MapPin, Building2, Star } from "lucide-react";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@opensales/ui";
import { useContact, useUpdateContact } from "@/hooks/useContacts";
import { useActivities, useCreateActivity } from "@/hooks/useActivities";
import { formatDate, formatRelativeTime } from "@opensales/shared";
import { toast } from "sonner";

const STAGE_COLORS: Record<string, "default" | "info" | "success" | "warning" | "destructive"> = {
  NEW: "default", CONTACTED: "info", QUALIFIED: "success", PROPOSAL: "warning", WON: "success", LOST: "destructive",
};

export default function ContactProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");
  const [noteText, setNoteText] = useState("");

  const { data: contact, isLoading } = useContact(id);
  const { data: activities } = useActivities({ contactId: id });
  const createActivity = useCreateActivity();
  const updateContact = useUpdateContact(id);

  async function logNote() {
    if (!noteText.trim()) return;
    await createActivity.mutateAsync({ entityType: "CONTACT", contactId: id, type: "NOTE", body: noteText });
    setNoteText("");
    toast.success("Note saved");
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!contact) return <div className="text-center py-20 text-muted-foreground">Contact not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{contact.firstName} {contact.lastName}</h1>
              <p className="text-muted-foreground">{contact.title ?? "No title"} {contact.company && <span>· <Link href={`/companies/${contact.company.id}`} className="text-primary hover:underline">{contact.company.name}</Link></span>}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant={STAGE_COLORS[contact.leadStage] ?? "default"}>{contact.leadStage}</Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="w-3 h-3" />
            {contact.leadScore}
          </div>
        </div>
      </div>

      {/* Contact Info Row */}
      <div className="flex gap-3 flex-wrap">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <Mail className="w-4 h-4" />{contact.email}
          </a>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />{contact.phone}
          </span>
        )}
        {contact.linkedinUrl && (
          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <Linkedin className="w-4 h-4" />LinkedIn
          </a>
        )}
        {contact.locationCity && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />{contact.locationCity}{contact.locationCountry ? `, ${contact.locationCountry}` : ""}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-4">
        {(["overview", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Seniority</p><p className="font-medium">{contact.seniority}</p></div>
                <div><p className="text-muted-foreground">Department</p><p className="font-medium">{contact.department ?? "—"}</p></div>
                <div><p className="text-muted-foreground">Source</p><p className="font-medium">{(contact as { source?: string }).source ?? "—"}</p></div>
                <div><p className="text-muted-foreground">Added</p><p className="font-medium">{formatDate(contact.createdAt)}</p></div>
              </CardContent>
            </Card>
            {contact.tags.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </CardContent>
              </Card>
            )}
          </div>
          <div>
            {contact.company && (
              <Card>
                <CardHeader><CardTitle className="text-base">Company</CardTitle></CardHeader>
                <CardContent>
                  <Link href={`/companies/${contact.company.id}`} className="flex items-center gap-3 hover:text-primary">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                    <span className="font-medium">{contact.company.name}</span>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-4">
          {/* Quick note */}
          <Card>
            <CardContent className="pt-4">
              <textarea
                className="w-full border rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={logNote} disabled={!noteText.trim() || createActivity.isPending}>
                  {createActivity.isPending ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline entries */}
          {activities?.data.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No activities yet. Log your first note above.</p>
          )}
          {activities?.data.map((a) => (
            <div key={a.id} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                {a.type === "NOTE" ? "📝" : a.type === "CALL" ? "📞" : a.type === "TASK" ? "✅" : "📧"}
              </div>
              <div className="flex-1 bg-card rounded-md border p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{a.type} · {a.createdBy.name}</span>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</span>
                </div>
                <p className="text-sm">{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
