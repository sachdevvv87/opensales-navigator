"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  List,
  CheckSquare,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  Puzzle,
} from "lucide-react";
import { cn } from "@opensales/ui";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/lists", label: "Lists", icon: List },
  { href: "/activities", label: "Activities", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const bottomItems = [
  { href: "/integrations", label: "Integrations", icon: Zap },
  { href: "/settings/integrations", label: "API & ICP", icon: Puzzle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, org } = useAuthStore();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">OS</span>
          </div>
          <div>
            <p className="font-semibold text-sm">{org?.name ?? "OpenSales"}</p>
            <p className="text-xs text-sidebar-foreground/60">Sales Navigator</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full text-left text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        {user && (
          <div className="px-3 py-2 mt-2 border-t border-sidebar-border">
            <p className="text-xs font-medium">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
