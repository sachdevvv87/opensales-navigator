import Link from "next/link";
import { User, Building2, Users, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@opensales/ui";

const settingsSections = [
  { href: "/settings/profile", title: "Profile", description: "Update your name, email, and password", icon: User },
  { href: "/settings/organization", title: "Organization", description: "Manage your workspace name and settings", icon: Building2 },
  { href: "/settings/team", title: "Team", description: "Invite team members and manage roles", icon: Users },
  { href: "/integrations", title: "Integrations", description: "Connect CRM tools and enrichment APIs", icon: Zap },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
