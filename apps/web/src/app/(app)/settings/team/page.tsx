"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Label, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@opensales/ui";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { UserPlus } from "lucide-react";

const ROLE_COLORS: Record<string, "default" | "info" | "warning" | "secondary"> = {
  ORG_ADMIN: "default",
  MANAGER: "info",
  SALES_REP: "secondary",
  VIEWER: "secondary",
};

const ROLES = ["ORG_ADMIN", "MANAGER", "SALES_REP", "VIEWER"] as const;

function useTeamMembers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string; email: string; role: string; lastLoginAt: string | null; createdAt: string }>>("/admin/users");
      return data;
    },
  });
}

function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data } = await api.post<{ inviteUrl: string }>("/admin/invitations", { email, role });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export default function TeamPage() {
  const { user: me } = useAuthStore();
  const { data: members = [], isLoading } = useTeamMembers();
  const invite = useInviteMember();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("SALES_REP");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    try {
      const result = await invite.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      setInviteUrl(result.inviteUrl);
      toast.success("Invitation created");
    } catch {
      toast.error("Failed to create invitation");
    }
  }

  function handleCopyLink() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    }
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("SALES_REP");
    setInviteUrl(null);
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage members and invite new people.</p>
        </div>
        {me?.role === "ORG_ADMIN" && (
          <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) closeInvite(); else setInviteOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              {inviteUrl ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Share this link with the invitee. It expires in 7 days.</p>
                  <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono break-all">{inviteUrl}</div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={handleCopyLink}>Copy Link</Button>
                    <Button onClick={closeInvite}>Done</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input id="invite-email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <div className="flex gap-2 flex-wrap">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setInviteRole(r)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            inviteRole === r
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-input hover:bg-muted"
                          }`}
                        >
                          {r.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeInvite}>Cancel</Button>
                    <Button onClick={handleInvite} disabled={!inviteEmail.trim() || invite.isPending}>
                      {invite.isPending ? "Sending…" : "Send Invite"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""} in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name}
                      {member.id === me?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_COLORS[member.role] ?? "secondary"} className="text-xs">
                        {member.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
