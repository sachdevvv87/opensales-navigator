"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label } from "@opensales/ui";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useOrgSettings } from "@/hooks/useEnrichment";

export default function OrganizationPage() {
  const { org } = useAuthStore();
  const { data: orgData } = useOrgSettings();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgData?.name) setName(orgData.name);
  }, [orgData]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.patch("/admin/settings", { name: name.trim() });
      toast.success("Organization name updated");
    } catch {
      toast.error("Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Organization</h1>
        <p className="text-muted-foreground">Manage your workspace settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
          <CardDescription>Your organization name shown across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={org?.slug ?? ""} disabled className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
