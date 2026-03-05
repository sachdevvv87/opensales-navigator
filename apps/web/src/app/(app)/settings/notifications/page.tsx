"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@opensales/ui";
import { useAlertSettings, useSaveAlertSettings } from "@/hooks/useCrm";

export default function NotificationSettingsPage() {
  const { data, isLoading } = useAlertSettings();
  const save = useSaveAlertSettings();

  // SMTP state
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");

  // Webhook state
  const [slackUrl, setSlackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (!data) return;
    if (data.smtp) {
      setSmtpHost(data.smtp.host ?? "");
      setSmtpPort(String(data.smtp.port ?? 587));
      setSmtpUser(data.smtp.user ?? "");
      setSmtpFrom(data.smtp.from ?? "");
      // don't pre-fill password for security
    }
    setSlackUrl(data.slack ?? "");
    setWebhookUrl(data.webhook ?? "");
  }, [data]);

  function handleSaveSmtp() {
    if (!smtpHost || !smtpUser || !smtpPassword) {
      toast.error("Host, user, and password are required");
      return;
    }
    save.mutate(
      {
        smtp: {
          host: smtpHost,
          port: parseInt(smtpPort) || 587,
          secure: parseInt(smtpPort) === 465,
          user: smtpUser,
          password: smtpPassword,
          from: smtpFrom || smtpUser,
        },
      },
      {
        onSuccess: () => toast.success("SMTP settings saved"),
        onError: () => toast.error("Failed to save SMTP settings"),
      }
    );
  }

  function handleSaveWebhooks() {
    save.mutate(
      {
        slack: slackUrl || null,
        webhook: webhookUrl || null,
      },
      {
        onSuccess: () => toast.success("Webhook settings saved"),
        onError: () => toast.error("Failed to save webhook settings"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">Configure email and webhook delivery for alert rules.</p>
      </div>

      {/* SMTP */}
      <Card>
        <CardHeader>
          <CardTitle>Email (SMTP)</CardTitle>
          <CardDescription>
            Alert emails will be sent through your SMTP server when alert rules trigger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.example.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-user">Username</Label>
            <Input
              id="smtp-user"
              placeholder="user@example.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-password">Password</Label>
            <Input
              id="smtp-password"
              type="password"
              placeholder={data?.smtp ? "Enter new password to update" : "SMTP password"}
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-from">From Address (optional)</Label>
            <Input
              id="smtp-from"
              placeholder="OpenSales <alerts@example.com>"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveSmtp} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save SMTP"}
          </Button>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Post alert notifications to Slack or a custom HTTP endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="slack-url">Slack Incoming Webhook URL</Label>
            <Input
              id="slack-url"
              placeholder="https://hooks.slack.com/services/…"
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">Custom Webhook URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://your-service.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Receives a JSON POST with {"{type, title, body, data}"} on every alert.
            </p>
          </div>
          <Button onClick={handleSaveWebhooks} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save Webhooks"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
