import { prisma } from "@opensales/database";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface IcpConfig {
  targetTitles?: string[];
  targetSeniorities?: string[];
  targetIndustries?: string[];
  targetCompanySizes?: string[]; // e.g. "11-50", "51-200"
  targetLocations?: string[];
}

export interface ProspectResult {
  firstName: string;
  lastName: string;
  email?: string;
  title?: string;
  linkedinUrl?: string;
  companyName?: string;
  companyDomain?: string;
  locationCity?: string;
  locationCountry?: string;
  seniority?: string;
  department?: string;
  avatarUrl?: string;
  apolloId?: string; // to detect duplicates
}

// ─── Apollo.io ─────────────────────────────────────────────────────────────

const APOLLO_BASE = "https://api.apollo.io/v1";

// Map our size labels to Apollo employee ranges
const SIZE_TO_APOLLO: Record<string, string> = {
  "1-10": "1,10",
  "11-50": "11,50",
  "51-200": "51,200",
  "201-500": "201,500",
  "501-1000": "501,1000",
  "1000+": "1001,10000",
};

export async function apolloProspect(
  icp: IcpConfig,
  apiKey: string,
  page = 1
): Promise<{ results: ProspectResult[]; total: number }> {
  const body: Record<string, any> = {
    api_key: apiKey,
    page,
    per_page: 25,
  };

  if (icp.targetTitles?.length) body.person_titles = icp.targetTitles;
  if (icp.targetSeniorities?.length) body.person_seniorities = icp.targetSeniorities.map((s) => s.toLowerCase());
  if (icp.targetIndustries?.length) body.q_organization_keyword_tags = icp.targetIndustries;
  if (icp.targetLocations?.length) body.person_locations = icp.targetLocations;
  if (icp.targetCompanySizes?.length) {
    body.organization_num_employees_ranges = icp.targetCompanySizes
      .map((s) => SIZE_TO_APOLLO[s])
      .filter(Boolean);
  }

  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apollo API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as any;
  const people = data.people ?? [];

  const results: ProspectResult[] = people.map((p: any) => ({
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    email: p.email ?? undefined,
    title: p.title ?? undefined,
    linkedinUrl: p.linkedin_url ?? undefined,
    companyName: p.organization?.name ?? undefined,
    companyDomain: p.organization?.website_url ?? undefined,
    locationCity: p.city ?? undefined,
    locationCountry: p.country ?? undefined,
    seniority: p.seniority?.toUpperCase() ?? undefined,
    department: p.departments?.[0] ?? undefined,
    avatarUrl: p.photo_url ?? undefined,
    apolloId: p.id ?? undefined,
  }));

  return { results, total: data.pagination?.total_entries ?? results.length };
}

export async function apolloEnrichContact(
  contactData: { firstName: string; lastName: string; email?: string; companyName?: string },
  apiKey: string
): Promise<Partial<ProspectResult>> {
  const body: Record<string, any> = {
    api_key: apiKey,
    first_name: contactData.firstName,
    last_name: contactData.lastName,
  };
  if (contactData.email) body.email = contactData.email;
  if (contactData.companyName) body.organization_name = contactData.companyName;

  const res = await fetch(`${APOLLO_BASE}/people/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Apollo enrichment error: ${res.status}`);

  const data = (await res.json()) as any;
  const p = data.person;
  if (!p) return {};

  return {
    email: p.email ?? undefined,
    title: p.title ?? undefined,
    linkedinUrl: p.linkedin_url ?? undefined,
    locationCity: p.city ?? undefined,
    locationCountry: p.country ?? undefined,
    seniority: p.seniority?.toUpperCase() ?? undefined,
    department: p.departments?.[0] ?? undefined,
    avatarUrl: p.photo_url ?? undefined,
    companyName: p.organization?.name ?? undefined,
    companyDomain: p.organization?.website_url ?? undefined,
  };
}

// ─── Hunter.io ─────────────────────────────────────────────────────────────

export async function hunterFindEmail(
  firstName: string,
  lastName: string,
  domain: string,
  apiKey: string
): Promise<string | null> {
  const url = new URL("https://api.hunter.io/v2/email-finder");
  url.searchParams.set("domain", domain);
  url.searchParams.set("first_name", firstName);
  url.searchParams.set("last_name", lastName);
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = (await res.json()) as any;
  return data.data?.email ?? null;
}

// ─── Clearbit ─────────────────────────────────────────────────────────────

export interface ClearbitCompanyData {
  name?: string;
  description?: string;
  industry?: string;
  employeeCount?: number;
  logoUrl?: string;
  website?: string;
  foundedYear?: number;
  hqCity?: string;
  hqCountry?: string;
  techStack?: string[];
  fundingStage?: string;
}

export async function clearbitEnrichCompany(
  domain: string,
  apiKey: string
): Promise<ClearbitCompanyData> {
  const res = await fetch(
    `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!res.ok) throw new Error(`Clearbit error: ${res.status}`);
  const d = (await res.json()) as any;

  return {
    name: d.name ?? undefined,
    description: d.description ?? undefined,
    industry: d.category?.industry ?? undefined,
    employeeCount: d.metrics?.employees ?? undefined,
    logoUrl: d.logo ?? undefined,
    website: d.domain ?? undefined,
    foundedYear: d.foundedYear ?? undefined,
    hqCity: d.geo?.city ?? undefined,
    hqCountry: d.geo?.country ?? undefined,
    techStack: d.tech ?? [],
    fundingStage: d.crunchbase?.handle ? "funded" : undefined,
  };
}

// ─── Org API Key helpers ────────────────────────────────────────────────────

export async function getOrgApiKeys(orgId: string): Promise<{
  apollo?: string;
  hunter?: string;
  clearbit?: string;
}> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
  const settings = (org?.settings as Record<string, any>) ?? {};
  return settings.apiKeys ?? {};
}
