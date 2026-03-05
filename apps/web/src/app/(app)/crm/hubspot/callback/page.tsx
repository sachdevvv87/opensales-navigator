"use client";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

export default function HubSpotCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      toast.error(error ?? "HubSpot auth failed");
      router.replace("/integrations");
      return;
    }

    api
      .post("/crm/hubspot/oauth/callback", { code })
      .then(() => {
        toast.success("HubSpot connected successfully");
        router.replace("/integrations");
      })
      .catch((err) => {
        toast.error(err?.response?.data?.error ?? "Failed to connect HubSpot");
        router.replace("/integrations");
      });
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        Connecting HubSpot…
      </div>
    </div>
  );
}
