import { prisma } from "@opensales/database";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HubSpotTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp ms
  portalId: string;
}

interface HsContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  linkedinUrl?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  company?: { name?: string | null } | null;
}

interface HsCompany {
  id: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  description?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  hqCity?: string | null;
  hqCountry?: string | null;
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function getHubSpotAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope:
      "crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write",
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeHubSpotCode(
  code: string,
  redirectUri: string
): Promise<HubSpotTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
    client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot token exchange failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const accessToken = data.access_token as string;
  const refreshToken = data.refresh_token as string;
  const expiresAt = Date.now() + (data.expires_in as number) * 1000;

  // Fetch portal ID
  let portalId = "";
  try {
    const infoRes = await fetch(
      `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`
    );
    if (infoRes.ok) {
      const info = (await infoRes.json()) as Record<string, unknown>;
      portalId = String(info.hub_id ?? info.portal_id ?? "");
    }
  } catch {
    // non-fatal
  }

  return { accessToken, refreshToken, expiresAt, portalId };
}

export async function refreshHubSpotToken(connection: {
  id: string;
  credentialsJson: unknown;
}): Promise<HubSpotTokens> {
  const creds = connection.credentialsJson as { hubspot?: HubSpotTokens };
  const tokens = creds?.hubspot;
  if (!tokens) throw new Error("No HubSpot tokens on connection");

  // Return early if token is still valid for > 5 minutes
  if (tokens.expiresAt - Date.now() > 5 * 60 * 1000) return tokens;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
    client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? "",
    refresh_token: tokens.refreshToken,
  });
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot token refresh failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const newTokens: HubSpotTokens = {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) ?? tokens.refreshToken,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
    portalId: tokens.portalId,
  };

  await (prisma.crmConnection as any).update({
    where: { id: connection.id },
    data: { credentialsJson: { hubspot: newTokens } as any },
  });

  return newTokens;
}

export async function getValidHubSpotToken(connection: {
  id: string;
  credentialsJson: unknown;
}): Promise<string> {
  const tokens = await refreshHubSpotToken(connection);
  return tokens.accessToken;
}

// ─── Contact sync ────────────────────────────────────────────────────────────

export async function pushContactToHubSpot(
  contact: HsContact,
  accessToken: string
): Promise<string> {
  const properties: Record<string, string> = {};
  if (contact.firstName) properties.firstname = contact.firstName;
  if (contact.lastName) properties.lastname = contact.lastName;
  if (contact.email) properties.email = contact.email;
  if (contact.phone) properties.phone = contact.phone;
  if (contact.title) properties.jobtitle = contact.title;
  if (contact.company?.name) properties.company = contact.company.name;
  if (contact.locationCity) properties.city = contact.locationCity;
  if (contact.locationCountry) properties.country = contact.locationCountry;
  if (contact.linkedinUrl) properties.linkedin_url = contact.linkedinUrl;

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  if (res.status === 409) {
    const errBody = (await res.json()) as Record<string, unknown>;
    const msg = String(errBody.message ?? errBody.error ?? "");
    const existingId =
      msg.match(/existing ID: (\S+)/)?.[1] ??
      String((errBody as any).id ?? "");
    if (!existingId) throw new Error(`HubSpot contact conflict, unknown ID`);

    const patchRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties }),
      }
    );
    if (!patchRes.ok) {
      const err = await patchRes.text();
      throw new Error(`HubSpot PATCH contact failed: ${patchRes.status} ${err}`);
    }
    const patched = (await patchRes.json()) as Record<string, unknown>;
    return String(patched.id ?? existingId);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot POST contact failed: ${res.status} ${err}`);
  }
  const created = (await res.json()) as Record<string, unknown>;
  return String(created.id);
}

// ─── Company sync ─────────────────────────────────────────────────────────────

export async function pushCompanyToHubSpot(
  company: HsCompany,
  accessToken: string
): Promise<string> {
  const properties: Record<string, string | number> = { name: company.name };
  if (company.domain) properties.domain = company.domain;
  if (company.website) properties.website = company.website;
  if (company.description) properties.description = company.description;
  if (company.industry) properties.industry = company.industry;
  if (company.employeeCount) properties.numberofemployees = company.employeeCount;
  if (company.hqCity) properties.city = company.hqCity;
  if (company.hqCountry) properties.country = company.hqCountry;

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  if (res.status === 409) {
    const errBody = (await res.json()) as Record<string, unknown>;
    const msg = String(errBody.message ?? errBody.error ?? "");
    const existingId =
      msg.match(/existing ID: (\S+)/)?.[1] ??
      String((errBody as any).id ?? "");
    if (!existingId) throw new Error(`HubSpot company conflict, unknown ID`);

    const patchRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${existingId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties }),
      }
    );
    if (!patchRes.ok) {
      const err = await patchRes.text();
      throw new Error(`HubSpot PATCH company failed: ${patchRes.status} ${err}`);
    }
    const patched = (await patchRes.json()) as Record<string, unknown>;
    return String(patched.id ?? existingId);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot POST company failed: ${res.status} ${err}`);
  }
  const created = (await res.json()) as Record<string, unknown>;
  return String(created.id);
}

// ─── Pull ────────────────────────────────────────────────────────────────────

export async function pullContactsFromHubSpot(
  accessToken: string,
  after?: string
): Promise<{ contacts: Record<string, unknown>[]; nextPage?: string }> {
  const props =
    "firstname,lastname,email,phone,jobtitle,company,city,country,linkedin_url";
  let url = `https://api.hubapi.com/crm/v3/objects/contacts?properties=${props}&limit=100`;
  if (after) url += `&after=${encodeURIComponent(after)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot pull contacts failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const paging = data.paging as Record<string, unknown> | undefined;
  const next = paging?.next as Record<string, unknown> | undefined;
  return {
    contacts: (data.results as Record<string, unknown>[]) ?? [],
    nextPage: next?.after as string | undefined,
  };
}

export function mapHubSpotContactToOurs(
  hsContact: Record<string, unknown>
): Record<string, unknown> {
  const p = (hsContact.properties as Record<string, unknown>) ?? {};
  return {
    firstName: (p.firstname as string) ?? "",
    lastName: (p.lastname as string) ?? "",
    email: (p.email as string) ?? undefined,
    phone: (p.phone as string) ?? undefined,
    title: (p.jobtitle as string) ?? undefined,
    locationCity: (p.city as string) ?? undefined,
    locationCountry: (p.country as string) ?? undefined,
    linkedinUrl: (p.linkedin_url as string) ?? undefined,
    source: "hubspot",
  };
}
