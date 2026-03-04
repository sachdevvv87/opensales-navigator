import { PrismaClient, UserRole, LeadStage, Seniority, ActivityType } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

// Simple bcrypt-like hash for seeding (use real bcrypt in production)
function hashPassword(password: string): string {
  return createHash("sha256").update(password + "salt_seed").digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create org
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
      settings: { timezone: "America/New_York", currency: "USD" },
    },
  });

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { orgId_email: { orgId: org.id, email: "admin@acme.com" } },
    update: {},
    create: {
      orgId: org.id,
      email: "admin@acme.com",
      name: "Admin User",
      passwordHash: hashPassword("password123"),
      role: UserRole.ORG_ADMIN,
    },
  });

  // Create a sales rep
  const rep = await prisma.user.upsert({
    where: { orgId_email: { orgId: org.id, email: "sarah@acme.com" } },
    update: {},
    create: {
      orgId: org.id,
      email: "sarah@acme.com",
      name: "Sarah Johnson",
      passwordHash: hashPassword("password123"),
      role: UserRole.SALES_REP,
    },
  });

  // Create sample companies
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { id: "company-techcorp" },
      update: {},
      create: {
        id: "company-techcorp",
        orgId: org.id,
        name: "TechCorp Solutions",
        domain: "techcorp.com",
        website: "https://techcorp.com",
        industry: "Software & Technology",
        employeeCount: 250,
        revenueRange: "$10M-$50M",
        hqCity: "San Francisco",
        hqCountry: "United States",
        accountOwnerId: admin.id,
        createdBy: admin.id,
      },
    }),
    prisma.company.upsert({
      where: { id: "company-globalretail" },
      update: {},
      create: {
        id: "company-globalretail",
        orgId: org.id,
        name: "Global Retail Inc",
        domain: "globalretail.com",
        industry: "Retail",
        employeeCount: 1500,
        revenueRange: "$100M-$500M",
        hqCity: "New York",
        hqCountry: "United States",
        accountOwnerId: rep.id,
        createdBy: admin.id,
      },
    }),
    prisma.company.upsert({
      where: { id: "company-financeplus" },
      update: {},
      create: {
        id: "company-financeplus",
        orgId: org.id,
        name: "FinancePlus Group",
        domain: "financeplus.com",
        industry: "Financial Services",
        employeeCount: 800,
        revenueRange: "$50M-$100M",
        hqCity: "Chicago",
        hqCountry: "United States",
        createdBy: admin.id,
      },
    }),
  ]);

  // Sample contacts data
  const contactsData = [
    { firstName: "James", lastName: "Wilson", title: "Chief Technology Officer", seniority: Seniority.C_SUITE, email: "james.wilson@techcorp.com", companyId: companies[0].id, leadStage: LeadStage.QUALIFIED, leadScore: 85 },
    { firstName: "Emily", lastName: "Chen", title: "VP of Engineering", seniority: Seniority.VP, email: "emily.chen@techcorp.com", companyId: companies[0].id, leadStage: LeadStage.CONTACTED, leadScore: 72 },
    { firstName: "Michael", lastName: "Brown", title: "Director of Sales", seniority: Seniority.DIRECTOR, email: "m.brown@globalretail.com", companyId: companies[1].id, leadStage: LeadStage.NEW, leadScore: 45 },
    { firstName: "Sarah", lastName: "Davis", title: "Head of Marketing", seniority: Seniority.DIRECTOR, email: "sarah.davis@globalretail.com", companyId: companies[1].id, leadStage: LeadStage.PROPOSAL, leadScore: 90 },
    { firstName: "Robert", lastName: "Martinez", title: "CFO", seniority: Seniority.C_SUITE, email: "robert.m@financeplus.com", companyId: companies[2].id, leadStage: LeadStage.QUALIFIED, leadScore: 78 },
    { firstName: "Jennifer", lastName: "Taylor", title: "Senior Product Manager", seniority: Seniority.IC, email: "j.taylor@techcorp.com", companyId: companies[0].id, leadStage: LeadStage.NEW, leadScore: 55 },
    { firstName: "David", lastName: "Anderson", title: "CEO", seniority: Seniority.C_SUITE, email: "d.anderson@globalretail.com", companyId: companies[1].id, leadStage: LeadStage.CONTACTED, leadScore: 92 },
    { firstName: "Lisa", lastName: "Thompson", title: "VP Marketing", seniority: Seniority.VP, email: "lisa.t@financeplus.com", companyId: companies[2].id, leadStage: LeadStage.NEW, leadScore: 38 },
    { firstName: "Kevin", lastName: "Garcia", title: "Engineering Manager", seniority: Seniority.MANAGER, email: "k.garcia@techcorp.com", companyId: companies[0].id, leadStage: LeadStage.NEW, leadScore: 42 },
    { firstName: "Amanda", lastName: "White", title: "Director of Operations", seniority: Seniority.DIRECTOR, email: "a.white@financeplus.com", companyId: companies[2].id, leadStage: LeadStage.QUALIFIED, leadScore: 67 },
  ];

  for (const data of contactsData) {
    await prisma.contact.upsert({
      where: {
        id: `contact-${data.firstName.toLowerCase()}-${data.lastName.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `contact-${data.firstName.toLowerCase()}-${data.lastName.toLowerCase()}`,
        orgId: org.id,
        ...data,
        assignedToId: Math.random() > 0.5 ? admin.id : rep.id,
        createdById: admin.id,
        tags: ["imported", data.seniority === Seniority.C_SUITE ? "c-suite" : "mid-level"],
        locationCountry: "United States",
      },
    });
  }

  // Create a sample list
  const list = await prisma.list.upsert({
    where: { id: "list-q2-prospects" },
    update: {},
    create: {
      id: "list-q2-prospects",
      orgId: org.id,
      name: "Q2 Prospects",
      description: "High-priority prospects for Q2 outreach",
      type: "STATIC",
      ownerId: admin.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log(`   Org: ${org.name} (${org.id})`);
  console.log(`   Admin: ${admin.email} / password123`);
  console.log(`   Rep: ${rep.email} / password123`);
  console.log(`   Companies: ${companies.length}`);
  console.log(`   Contacts: ${contactsData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
