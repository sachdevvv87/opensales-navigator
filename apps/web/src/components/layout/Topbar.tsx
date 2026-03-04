"use client";
import { Bell, Search } from "lucide-react";
import { Button } from "@opensales/ui";
import { Input } from "@opensales/ui";
import { useAuthStore } from "@/store/auth.store";

export function Topbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 border-b bg-background flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts, companies... (Cmd+K)"
          className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">
          {user?.name?.charAt(0).toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
