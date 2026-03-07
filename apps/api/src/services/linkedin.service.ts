import { prisma } from "@opensales/database";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:4000/api/v1/linkedin/oauth/callback";

// Scopes available without Partner Program approval
const SCOPES = ["openid", "profile", "email"];

// ── OAuth helpers ──────────────────────────────────────────────────────────────

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: SCOPES.join(" "),
  });
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${err}`);
  }

  return response.json();
}

export async function fetchLinkedInProfile(accessToken: string): Promise<{
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  locale?: { country: string; language: string };
}> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LinkedIn profile fetch failed: ${err}`);
  }

  return response.json();
}

// ── Account management ─────────────────────────────────────────────────────────

export async function upsertLinkedInAccount(
  userId: string,
  orgId: string,
  tokenData: { access_token: string; expires_in: number; refresh_token?: string; scope: string },
  profile: { sub: string; name: string; email?: string; picture?: string }
) {
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  return (prisma.linkedInAccount as any).upsert({
    where: { userId },
    create: {
      userId,
      orgId,
      linkedInId: profile.sub,
      name: profile.name,
      email: profile.email ?? null,
      pictureUrl: profile.picture ?? null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      scopes: tokenData.scope.split(" "),
      lastSyncAt: new Date(),
    },
    update: {
      linkedInId: profile.sub,
      name: profile.name,
      email: profile.email ?? null,
      pictureUrl: profile.picture ?? null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      scopes: tokenData.scope.split(" "),
      lastSyncAt: new Date(),
    },
  });
}

export async function getLinkedInAccount(userId: string) {
  return (prisma.linkedInAccount as any).findUnique({ where: { userId } });
}

export async function disconnectLinkedIn(userId: string) {
  await (prisma.linkedInAccount as any).deleteMany({ where: { userId } });
}

// ── LinkedIn Connections CSV Parser ───────────────────────────────────────────
// LinkedIn exports connections as CSV from Settings → Data Privacy → Get a copy of your data → Connections

export interface LinkedInConnection {
  firstName: string;
  lastName: string;
  url: string;
  emailAddress: string;
  company: string;
  position: string;
  connectedOn: string;
}

export function parseLinkedInCsv(csvContent: string): LinkedInConnection[] {
  const lines = csvContent.split(/\r?\n/);
  const connections: LinkedInConnection[] = [];

  // Find the header row — LinkedIn CSV starts with notes, then the header
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes("first name") && line.includes("last name") && line.includes("url")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error("Invalid LinkedIn CSV format: could not find header row");
  }

  const headers = parseCsvRow(lines[headerIdx]).map((h) => h.trim().toLowerCase());
  const getIdx = (name: string) => headers.findIndex((h) => h.includes(name));

  const firstNameIdx = getIdx("first name");
  const lastNameIdx = getIdx("last name");
  const urlIdx = getIdx("url");
  const emailIdx = getIdx("email");
  const companyIdx = getIdx("company");
  const positionIdx = getIdx("position");
  const connectedOnIdx = getIdx("connected on");

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvRow(line);
    const firstName = cols[firstNameIdx]?.trim() ?? "";
    const lastName = cols[lastNameIdx]?.trim() ?? "";
    if (!firstName && !lastName) continue;

    connections.push({
      firstName,
      lastName,
      url: cols[urlIdx]?.trim() ?? "",
      emailAddress: cols[emailIdx]?.trim() ?? "",
      company: cols[companyIdx]?.trim() ?? "",
      position: cols[positionIdx]?.trim() ?? "",
      connectedOn: cols[connectedOnIdx]?.trim() ?? "",
    });
  }

  return connections;
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let current = "";

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ── Import connections into contacts ──────────────────────────────────────────

export async function importLinkedInConnections(
  connections: LinkedInConnection[],
  orgId: string,
  userId: string,
  logId: string
): Promise<{ imported: number; skipped: number; failed: number }> {
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const conn of connections) {
    try {
      // Check for duplicate by LinkedIn URL or email
      const existing = await prisma.contact.findFirst({
        where: {
          orgId,
          deletedAt: null,
          OR: [
            ...(conn.url ? [{ linkedinUrl: conn.url }] : []),
            ...(conn.emailAddress ? [{ email: conn.emailAddress }] : []),
          ],
        },
      });

      if (existing) {
        // Update LinkedIn URL if we have it and they don't
        if (conn.url && !existing.linkedinUrl) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: { linkedinUrl: conn.url },
          });
        }
        skipped++;
        continue;
      }

      await prisma.contact.create({
        data: {
          orgId,
          firstName: conn.firstName,
          lastName: conn.lastName,
          email: conn.emailAddress || null,
          title: conn.position || null,
          linkedinUrl: conn.url || null,
          source: "linkedin_import",
          createdById: userId,
          ...(conn.company
            ? {}
            : {}),
        },
      });

      // If company name exists, try to link or create company
      if (conn.company) {
        let company = await prisma.company.findFirst({
          where: { orgId, name: conn.company, deletedAt: null },
        });

        if (!company) {
          company = await prisma.company.create({
            data: {
              orgId,
              name: conn.company,
              createdBy: userId,
            },
          });
        }

        // Link contact to company
        const contact = await prisma.contact.findFirst({
          where: {
            orgId,
            firstName: conn.firstName,
            lastName: conn.lastName,
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });

        if (contact && company) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { companyId: company.id },
          });
        }
      }

      imported++;
    } catch {
      failed++;
    }
  }

  // Update the import log
  await (prisma.linkedInImportLog as any).update({
    where: { id: logId },
    data: { imported, skipped, failed, status: "COMPLETED" },
  });

  return { imported, skipped, failed };
}
