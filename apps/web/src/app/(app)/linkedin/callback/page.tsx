"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// LinkedIn redirects to the API callback (not here), but this page handles
// the frontend redirect from the API callback (integrations?linkedin_connected=1)
// This page is a fallback if the user lands here directly.

export default function LinkedInCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const error = params.get("linkedin_error");
    const connected = params.get("linkedin_connected");

    if (error) {
      toast.error(`LinkedIn connection failed: ${error}`);
    } else if (connected) {
      toast.success("LinkedIn connected successfully!");
    }

    router.replace("/integrations");
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Completing LinkedIn connection…</p>
      </div>
    </div>
  );
}
