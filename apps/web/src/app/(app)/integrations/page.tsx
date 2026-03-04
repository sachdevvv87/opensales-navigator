import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@opensales/ui";

const integrations = [
  { name: "HubSpot", description: "Two-way contact & company sync", status: "coming-soon" },
  { name: "Salesforce", description: "Sync leads, contacts, and opportunities", status: "coming-soon" },
  { name: "Pipedrive", description: "Sync contacts and deals", status: "coming-soon" },
  { name: "Clearbit", description: "Enrich contacts and companies", status: "coming-soon" },
  { name: "Hunter.io", description: "Find and verify email addresses", status: "coming-soon" },
  { name: "Apollo.io", description: "Full contact enrichment", status: "coming-soon" },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect OpenSales with your existing tools.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(({ name, description, status }) => (
          <Card key={name} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{name}</CardTitle>
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
