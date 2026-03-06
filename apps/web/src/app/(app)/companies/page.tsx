"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2, Download } from "lucide-react";
import { Button, Input, Badge, Skeleton } from "@opensales/ui";
import { useCompanies } from "@/hooks/useCompanies";

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCompanies({ search, page, limit: 25 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          {data && <p className="text-muted-foreground text-sm">{data.pagination.total.toLocaleString()} total</p>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/companies/export`; }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Company</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search companies..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Company</th>
              <th className="text-left p-3 font-medium">Industry</th>
              <th className="text-left p-3 font-medium">Size</th>
              <th className="text-left p-3 font-medium">Location</th>
              <th className="text-left p-3 font-medium">Tier</th>
              <th className="text-left p-3 font-medium">Contacts</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="p-3"><Skeleton className="h-4 w-full" /></td>)}
                  </tr>
                ))
              : data?.data.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Link href={`/companies/${company.id}`} className="flex items-center gap-2 hover:text-primary">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          {company.domain && <div className="text-xs text-muted-foreground">{company.domain}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{company.industry ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{company.employeeCount ? `${company.employeeCount.toLocaleString()} emp.` : "—"}</td>
                    <td className="p-3 text-muted-foreground">{company.hqCity ?? "—"}{company.hqCountry ? `, ${company.hqCountry}` : ""}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{company.accountTier}</Badge></td>
                    <td className="p-3 text-muted-foreground">{company._count?.contacts ?? 0}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!data.pagination.hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
