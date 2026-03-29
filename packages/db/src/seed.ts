// packages/db/src/seed.ts
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { divisions, clients, income, expenses, leads, awsPricing } from "./schema";

config({ path: resolve(import.meta.dir, "../.env") });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  ssl: { rejectUnauthorized: true },
});
await client.connect();
const db = drizzle(client);

console.log("🌱 Seeding database...");

// ── Divisions ────────────────────────────────────────────────────────────────
const [pmg, tes, aws] = await db
  .insert(divisions)
  .values([
    { name: "Playhouse Media Group" },
    { name: "Tender Edge Solutions" },
    { name: "Apex Web Solutions" },
  ])
  .returning();

console.log("  ✓ divisions");

// ── Clients ──────────────────────────────────────────────────────────────────
const [clientA, clientB, clientC, clientD, clientE, clientF, clientG] = await db
  .insert(clients)
  .values([
    {
      name: "Sipho Dlamini",
      businessName: "Dlamini Construction CC",
      email: "sipho@dlaminicc.co.za",
      phone: "0821234567",
    },
    {
      name: "Priya Naidoo",
      businessName: "Naidoo Logistics (Pty) Ltd",
      email: "priya@naidoolog.co.za",
      phone: "0839876543",
    },
    {
      name: "Johan van der Merwe",
      businessName: "VDM Electrical",
      email: "johan@vdmelectrical.co.za",
      phone: "0764561234",
    },
    {
      name: "Lungelo Zulu",
      businessName: "Zulu Security Services",
      email: "lungelo@zulusecurity.co.za",
      phone: "0731234567",
    },
    {
      name: "Aisha Mohamed",
      businessName: "Mohamed Cleaning Solutions",
      email: "aisha@mohamedcleaning.co.za",
      phone: "0844567890",
    },
    {
      name: "Zanele Mthembu",
      businessName: "Mthembu Property Group",
      email: "zanele@mthembuproperty.co.za",
      phone: "0617890123",
    },
    {
      name: "Riaan Steyn",
      businessName: "Steyn Civil Engineering",
      email: "riaan@steyncivil.co.za",
      phone: "0829013456",
    },
  ])
  .returning();

console.log("  ✓ clients");

// ── AWS Pricing ───────────────────────────────────────────────────────────────
await db.insert(awsPricing).values([
  {
    name: "Starter",
    price: 1500,
    period: "month",
    description: "Perfect for small businesses getting started online.",
    features: ["1-page website", "Basic SEO setup", "Monthly report", "Email support"],
    cta: "Get Started",
    popular: false,
    type: "monthly",
    sortOrder: 1,
  },
  {
    name: "Growth",
    price: 3500,
    period: "month",
    description: "For growing businesses that need more reach and automation.",
    features: [
      "Up to 5 pages",
      "Google Ads management",
      "Social media scheduling",
      "Bi-weekly report",
      "Priority support",
    ],
    cta: "Start Growing",
    popular: true,
    type: "monthly",
    sortOrder: 2,
  },
  {
    name: "Pro",
    price: 7500,
    period: "month",
    description: "Full-service digital presence for established businesses.",
    features: [
      "Unlimited pages",
      "Full ad management",
      "Content creation",
      "Weekly strategy call",
      "Dedicated account manager",
    ],
    cta: "Go Pro",
    popular: false,
    type: "monthly",
    sortOrder: 3,
  },
  {
    name: "Logo & Brand Identity",
    price: 4500,
    upfront: 4500,
    description: "One-time brand identity package including logo, colours, and typography.",
    features: [
      "Logo design (3 concepts)",
      "Brand colour palette",
      "Typography guide",
      "Business card design",
      "All source files",
    ],
    cta: "Order Now",
    popular: false,
    type: "once_off",
    sortOrder: 4,
  },
  {
    name: "Website Launch",
    price: 12000,
    upfront: 12000,
    description: "Complete website build, deployed and ready to go.",
    features: [
      "Up to 8 pages",
      "Mobile responsive",
      "Contact form",
      "Basic SEO",
      "1 month free support",
    ],
    cta: "Build My Site",
    popular: false,
    type: "once_off",
    sortOrder: 5,
  },
]);

console.log("  ✓ aws_pricing");

// ── Income (Oct 2024 – Mar 2025) ─────────────────────────────────────────────
//
// Monthly revenue (all 3 divisions combined):
//   Oct 2024 → ~R65,850   Nov 2024 → ~R82,450   Dec 2024 → ~R54,250
//   Jan 2025 → ~R88,400   Feb 2025 → ~R85,350   Mar 2025 → ~R137,700
//
await db.insert(income).values([

  // ────────────────────────────────────────────────────────────────────────
  // OCTOBER 2024 — Total ~R65,850
  // PMG: R15,500  |  TES: R21,400  |  AWS: R28,950
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2024-10-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Oct", amount: "3500.00" },
  { date: "2024-10-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Oct", amount: "4000.00" },
  { date: "2024-10-14", divisionId: pmg!.id, clientId: clientF!.id, description: "Brand identity & company profile design", amount: "8000.00" },

  // TES
  { date: "2024-10-03", divisionId: tes!.id, clientId: clientB!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2024-10-07", divisionId: tes!.id, clientId: clientA!.id, description: "CIDB Grade 1 application", amount: "1200.00" },
  { date: "2024-10-10", divisionId: tes!.id, clientId: clientD!.id, description: "CSD registration + COIDA + B-BBEE affidavit", amount: "2500.00" },
  { date: "2024-10-15", divisionId: tes!.id, clientId: clientE!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2024-10-18", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil engineering bid", amount: "4500.00" },
  { date: "2024-10-22", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Oct", amount: "1500.00" },
  { date: "2024-10-25", divisionId: tes!.id, clientId: clientC!.id, description: "SBD forms pack (SBD1, 4, 6.1, 8, 9)", amount: "950.00" },
  { date: "2024-10-28", divisionId: tes!.id, clientId: clientE!.id, description: "Municipal supplier database registration", amount: "500.00" },
  { date: "2024-10-30", divisionId: tes!.id, clientId: clientF!.id, description: "B-BBEE affidavit preparation", amount: "550.00" },

  // AWS
  { date: "2024-10-01", divisionId: aws!.id, clientId: clientB!.id, description: "Growth package — Oct", amount: "3500.00" },
  { date: "2024-10-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Oct", amount: "450.00" },
  { date: "2024-10-04", divisionId: aws!.id, clientId: clientC!.id, description: "Business website build — VDM Electrical", amount: "12000.00" },
  { date: "2024-10-15", divisionId: aws!.id, clientId: clientD!.id, description: "Website build — Zulu Security Services", amount: "8500.00" },
  { date: "2024-10-20", divisionId: aws!.id, clientId: clientF!.id, description: "Logo & brand identity package", amount: "4500.00" },

  // ────────────────────────────────────────────────────────────────────────
  // NOVEMBER 2024 — Total ~R82,450
  // PMG: R20,000  |  TES: R26,500  |  AWS: R35,950
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2024-11-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Nov", amount: "3500.00" },
  { date: "2024-11-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2024-11-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2024-11-12", divisionId: pmg!.id, clientId: clientG!.id, description: "Company profile design & branding package", amount: "8500.00" },

  // TES
  { date: "2024-11-05", divisionId: tes!.id, clientId: clientE!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2024-11-08", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — provincial infrastructure bid", amount: "4500.00" },
  { date: "2024-11-10", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation & pricing support", amount: "3000.00" },
  { date: "2024-11-12", divisionId: tes!.id, clientId: clientD!.id, description: "CIDB Grade 2–3 application", amount: "1800.00" },
  { date: "2024-11-15", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2024-11-15", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2024-11-18", divisionId: tes!.id, clientId: clientC!.id, description: "CSD profile update + COIDA renewal", amount: "1200.00" },
  { date: "2024-11-20", divisionId: tes!.id, clientId: clientF!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2024-11-25", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2024-11-28", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms + additional compliance documents", amount: "1800.00" },

  // AWS
  { date: "2024-11-01", divisionId: aws!.id, clientId: clientB!.id, description: "Growth package — Nov", amount: "3500.00" },
  { date: "2024-11-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Nov", amount: "450.00" },
  { date: "2024-11-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Nov", amount: "3500.00" },
  { date: "2024-11-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Nov", amount: "1500.00" },
  { date: "2024-11-05", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce store build — Mohamed Cleaning", amount: "15000.00" },
  { date: "2024-11-15", divisionId: aws!.id, clientId: clientG!.id, description: "Business website build — Steyn Civil Engineering", amount: "12000.00" },

  // ────────────────────────────────────────────────────────────────────────
  // DECEMBER 2024 — Total ~R54,250
  // PMG: R11,500  |  TES: R17,350  |  AWS: R25,400
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2024-12-02", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Dec", amount: "3500.00" },
  { date: "2024-12-02", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Dec", amount: "4000.00" },
  { date: "2024-12-02", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Dec", amount: "4000.00" },

  // TES
  { date: "2024-12-03", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2024-12-03", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2024-12-03", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2024-12-10", divisionId: tes!.id, clientId: clientC!.id, description: "Tender-Ready Starter bundle", amount: "2500.00" },
  { date: "2024-12-12", divisionId: tes!.id, clientId: clientD!.id, description: "Annual CSD profile renewal & update", amount: "350.00" },
  { date: "2024-12-15", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — year-end government bid", amount: "4500.00" },
  { date: "2024-12-18", divisionId: tes!.id, clientId: clientF!.id, description: "B-BBEE affidavit renewal", amount: "550.00" },
  { date: "2024-12-20", divisionId: tes!.id, clientId: clientE!.id, description: "COIDA letter of good standing", amount: "450.00" },
  { date: "2024-12-23", divisionId: tes!.id, clientId: clientA!.id, description: "Tax Clearance PIN + SARS eFiling assistance", amount: "350.00" },
  { date: "2024-12-27", divisionId: tes!.id, clientId: clientC!.id, description: "Municipal supplier database registration", amount: "500.00" },
  { date: "2024-12-27", divisionId: tes!.id, clientId: clientB!.id, description: "B-BBEE affidavit — annual renewal", amount: "550.00" },
  { date: "2024-12-30", divisionId: tes!.id, clientId: clientD!.id, description: "COIDA registration", amount: "750.00" },
  { date: "2024-12-30", divisionId: tes!.id, clientId: clientF!.id, description: "Municipal & provincial supplier registration", amount: "500.00" },
  { date: "2024-12-22", divisionId: tes!.id, clientId: clientG!.id, description: "SBD forms pack — second bid submission", amount: "950.00" },

  // AWS
  { date: "2024-12-02", divisionId: aws!.id, clientId: clientB!.id, description: "Growth package — Dec", amount: "3500.00" },
  { date: "2024-12-02", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Dec", amount: "450.00" },
  { date: "2024-12-02", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Dec", amount: "3500.00" },
  { date: "2024-12-02", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Dec", amount: "1500.00" },
  { date: "2024-12-02", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Dec", amount: "750.00" },
  { date: "2024-12-02", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Dec", amount: "1200.00" },
  { date: "2024-12-08", divisionId: aws!.id, clientId: clientB!.id, description: "Website redesign — Naidoo Logistics", amount: "12000.00" },
  { date: "2024-12-10", divisionId: aws!.id, clientId: clientC!.id, description: "Website maintenance & annual SEO audit", amount: "2500.00" },

  // ────────────────────────────────────────────────────────────────────────
  // JANUARY 2025 — Total ~R88,400
  // PMG: R23,000  |  TES: R28,200  |  AWS: R37,200
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-01-02", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Jan", amount: "3500.00" },
  { date: "2025-01-02", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2025-01-02", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2025-01-02", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2025-01-20", divisionId: pmg!.id, clientId: clientB!.id, description: "New year marketing campaign — strategy + content assets", amount: "7500.00" },

  // TES
  { date: "2025-01-06", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2025-01-06", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2025-01-06", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2025-01-08", divisionId: tes!.id, clientId: clientE!.id, description: "Full tender compilation — Gauteng infrastructure bid", amount: "4500.00" },
  { date: "2025-01-10", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Q1", amount: "4500.00" },
  { date: "2025-01-12", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-01-15", divisionId: tes!.id, clientId: clientC!.id, description: "CIDB Grade 1 application", amount: "1200.00" },
  { date: "2025-01-18", divisionId: tes!.id, clientId: clientD!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2025-01-22", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation & pricing support", amount: "3000.00" },
  { date: "2025-01-28", divisionId: tes!.id, clientId: clientB!.id, description: "Additional SBD forms + Tax Clearance PIN", amount: "800.00" },

  // AWS
  { date: "2025-01-02", divisionId: aws!.id, clientId: clientB!.id, description: "Growth package — Jan", amount: "3500.00" },
  { date: "2025-01-02", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Jan", amount: "450.00" },
  { date: "2025-01-02", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Jan", amount: "3500.00" },
  { date: "2025-01-02", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Jan", amount: "1500.00" },
  { date: "2025-01-02", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Jan", amount: "1200.00" },
  { date: "2025-01-02", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Jan", amount: "750.00" },
  { date: "2025-01-06", divisionId: aws!.id, clientId: clientC!.id, description: "E-commerce store build — VDM Electrical trade store", amount: "15000.00" },
  { date: "2025-01-15", divisionId: aws!.id, clientId: clientF!.id, description: "Business website upgrade — Mthembu Property Group", amount: "8500.00" },
  { date: "2025-01-22", divisionId: aws!.id, clientId: clientB!.id, description: "SEO services + Google Ads campaign setup", amount: "3500.00" },

  // ────────────────────────────────────────────────────────────────────────
  // FEBRUARY 2025 — Total ~R85,350
  // PMG: R25,000  |  TES: R21,450  |  AWS: R38,900
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-02-03", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Feb", amount: "3500.00" },
  { date: "2025-02-03", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2025-02-03", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2025-02-03", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2025-02-15", divisionId: pmg!.id, clientId: clientE!.id, description: "Brand refresh — logo redesign + company profile", amount: "9500.00" },

  // TES
  { date: "2025-02-05", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2025-02-05", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2025-02-05", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2025-02-07", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Feb", amount: "4500.00" },
  { date: "2025-02-10", divisionId: tes!.id, clientId: clientF!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2025-02-12", divisionId: tes!.id, clientId: clientC!.id, description: "Tender-Ready Starter bundle", amount: "2500.00" },
  { date: "2025-02-15", divisionId: tes!.id, clientId: clientD!.id, description: "SBD forms pack + municipal supplier registration", amount: "1450.00" },
  { date: "2025-02-18", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation & pricing support", amount: "3000.00" },
  { date: "2025-02-25", divisionId: tes!.id, clientId: clientB!.id, description: "CIDB Grade 1 upgrade to Grade 2", amount: "1800.00" },

  // AWS
  { date: "2025-02-03", divisionId: aws!.id, clientId: clientB!.id, description: "Growth package — Feb", amount: "3500.00" },
  { date: "2025-02-03", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Feb", amount: "450.00" },
  { date: "2025-02-03", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Feb", amount: "3500.00" },
  { date: "2025-02-03", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Feb", amount: "1500.00" },
  { date: "2025-02-03", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Feb", amount: "750.00" },
  { date: "2025-02-03", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Feb", amount: "1200.00" },
  { date: "2025-02-10", divisionId: aws!.id, clientId: clientC!.id, description: "New business website build — VDM (second site)", amount: "12000.00" },
  { date: "2025-02-15", divisionId: aws!.id, clientId: clientD!.id, description: "Website redesign — Zulu Security Services", amount: "8500.00" },
  { date: "2025-02-20", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Feb", amount: "7500.00" },

  // ────────────────────────────────────────────────────────────────────────
  // MARCH 2025 — Total ~R137,700
  // PMG: R37,000  |  TES: R38,800  |  AWS: R61,900
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-03-03", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Mar", amount: "3500.00" },
  { date: "2025-03-03", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2025-03-03", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2025-03-03", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2025-03-10", divisionId: pmg!.id, clientId: clientB!.id, description: "Q1 marketing campaign — paid ads & content production", amount: "12000.00" },
  { date: "2025-03-20", divisionId: pmg!.id, clientId: clientE!.id, description: "Full brand identity package — Mohamed Cleaning", amount: "9500.00" },

  // TES
  { date: "2025-03-03", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2025-03-03", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2025-03-03", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2025-03-05", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Limpopo roads bid", amount: "4500.00" },
  { date: "2025-03-07", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Centurion civil works", amount: "4500.00" },
  { date: "2025-03-10", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-03-12", divisionId: tes!.id, clientId: clientC!.id, description: "Full tender compilation — electrical infrastructure", amount: "4500.00" },
  { date: "2025-03-15", divisionId: tes!.id, clientId: clientD!.id, description: "CIDB Grade 2–3 upgrade application", amount: "1800.00" },
  { date: "2025-03-18", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation — two bid packages", amount: "6000.00" },
  { date: "2025-03-20", divisionId: tes!.id, clientId: clientE!.id, description: "Full tender compilation — cleaning services contract", amount: "4200.00" },
  { date: "2025-03-24", divisionId: tes!.id, clientId: clientA!.id, description: "COIDA renewal + SARS Tax Clearance assistance", amount: "1800.00" },
  { date: "2025-03-28", divisionId: tes!.id, clientId: clientB!.id, description: "Additional compliance retainer — extra hours Mar", amount: "1500.00" },

  // AWS
  { date: "2025-03-03", divisionId: aws!.id, clientId: clientB!.id, description: "Growth package — Mar", amount: "3500.00" },
  { date: "2025-03-03", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Mar", amount: "450.00" },
  { date: "2025-03-03", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Mar", amount: "3500.00" },
  { date: "2025-03-03", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Mar", amount: "1500.00" },
  { date: "2025-03-03", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Mar", amount: "750.00" },
  { date: "2025-03-03", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Mar", amount: "1200.00" },
  { date: "2025-03-05", divisionId: aws!.id, clientId: clientC!.id, description: "Custom web application — VDM Electrical client portal", amount: "25000.00" },
  { date: "2025-03-15", divisionId: aws!.id, clientId: clientF!.id, description: "E-commerce store build — Mthembu Property", amount: "15000.00" },
  { date: "2025-03-20", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Mar", amount: "7500.00" },
  { date: "2025-03-25", divisionId: aws!.id, clientId: clientD!.id, description: "SEO services + Google Ads optimisation", amount: "3500.00" },

]);

console.log("  ✓ income");

// ── Expenses (Oct 2024 – Mar 2025) ────────────────────────────────────────────
await db.insert(expenses).values([

  // ────────────────────────────────────────────────────────────────────────
  // OCTOBER 2024
  // ────────────────────────────────────────────────────────────────────────
  { date: "2024-10-01", divisionId: pmg!.id, category: "Software", description: "Canva Pro subscription", amount: "350.00" },
  { date: "2024-10-01", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB — Oct", amount: "890.00" },
  { date: "2024-10-02", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — client campaign management", amount: "2200.00" },
  { date: "2024-10-05", divisionId: tes!.id, category: "Transport", description: "Client site visits — Centurion & Pretoria", amount: "650.00" },
  { date: "2024-10-10", divisionId: tes!.id, category: "Printing", description: "Tender document printing & binding", amount: "480.00" },
  { date: "2024-10-12", divisionId: pmg!.id, category: "Advertising", description: "Google Ads — lead generation", amount: "1500.00" },
  { date: "2024-10-15", divisionId: aws!.id, category: "Software", description: "Domain registrations — new client sites", amount: "450.00" },
  { date: "2024-10-20", divisionId: tes!.id, category: "Professional Services", description: "CIPC portal submission fees", amount: "150.00" },

  // ────────────────────────────────────────────────────────────────────────
  // NOVEMBER 2024
  // ────────────────────────────────────────────────────────────────────────
  { date: "2024-11-01", divisionId: pmg!.id, category: "Software", description: "Canva Pro subscription", amount: "350.00" },
  { date: "2024-11-01", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB — Nov", amount: "890.00" },
  { date: "2024-11-02", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — Nov client campaigns", amount: "2800.00" },
  { date: "2024-11-02", divisionId: pmg!.id, category: "Advertising", description: "Google Ads — Nov lead generation", amount: "2000.00" },
  { date: "2024-11-05", divisionId: tes!.id, category: "Transport", description: "Client visits — Centurion, Midrand, Pretoria", amount: "800.00" },
  { date: "2024-11-08", divisionId: tes!.id, category: "Printing", description: "Tender document printing & binding — 3 bids", amount: "650.00" },
  { date: "2024-11-10", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees", amount: "350.00" },
  { date: "2024-11-15", divisionId: aws!.id, category: "Software", description: "Google Workspace — client accounts", amount: "450.00" },
  { date: "2024-11-20", divisionId: aws!.id, category: "Software", description: "Adobe Creative Cloud licence", amount: "680.00" },
  { date: "2024-11-25", divisionId: tes!.id, category: "Printing", description: "Large-format printing — additional bid", amount: "380.00" },

  // ────────────────────────────────────────────────────────────────────────
  // DECEMBER 2024
  // ────────────────────────────────────────────────────────────────────────
  { date: "2024-12-01", divisionId: pmg!.id, category: "Software", description: "Canva Pro subscription", amount: "350.00" },
  { date: "2024-12-01", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB — Dec", amount: "890.00" },
  { date: "2024-12-02", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — Dec (reduced budget)", amount: "1500.00" },
  { date: "2024-12-05", divisionId: tes!.id, category: "Transport", description: "Year-end client visits & document drops", amount: "400.00" },
  { date: "2024-12-08", divisionId: tes!.id, category: "Printing", description: "Tender printing — year-end bids", amount: "320.00" },
  { date: "2024-12-10", divisionId: aws!.id, category: "Software", description: "Annual domain renewals — all client sites", amount: "1200.00" },
  { date: "2024-12-15", divisionId: pmg!.id, category: "General", description: "Year-end team appreciation lunch", amount: "850.00" },
  { date: "2024-12-20", divisionId: tes!.id, category: "Professional Services", description: "CIPC fees — December filings", amount: "200.00" },

  // ────────────────────────────────────────────────────────────────────────
  // JANUARY 2025
  // ────────────────────────────────────────────────────────────────────────
  { date: "2025-01-02", divisionId: pmg!.id, category: "Software", description: "Canva Pro subscription", amount: "350.00" },
  { date: "2025-01-02", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB — Jan", amount: "890.00" },
  { date: "2025-01-03", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — Jan new year push", amount: "3200.00" },
  { date: "2025-01-03", divisionId: pmg!.id, category: "Advertising", description: "Google Ads — Jan brand awareness", amount: "2500.00" },
  { date: "2025-01-05", divisionId: tes!.id, category: "Transport", description: "Client visits — Jan tender season kick-off", amount: "950.00" },
  { date: "2025-01-08", divisionId: tes!.id, category: "Printing", description: "Tender printing — Q1 bid submissions", amount: "580.00" },
  { date: "2025-01-10", divisionId: tes!.id, category: "Professional Services", description: "CIDB professional membership renewal", amount: "1500.00" },
  { date: "2025-01-15", divisionId: aws!.id, category: "Software", description: "Adobe Creative Cloud + Figma Pro licences", amount: "780.00" },
  { date: "2025-01-20", divisionId: aws!.id, category: "Freelancers", description: "Freelance designer — VDM e-commerce build support", amount: "2500.00" },
  { date: "2025-01-25", divisionId: tes!.id, category: "Professional Services", description: "CIPC portal & CSD submission fees", amount: "300.00" },

  // ────────────────────────────────────────────────────────────────────────
  // FEBRUARY 2025
  // ────────────────────────────────────────────────────────────────────────
  { date: "2025-02-01", divisionId: pmg!.id, category: "Software", description: "Canva Pro subscription", amount: "350.00" },
  { date: "2025-02-01", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB — Feb", amount: "890.00" },
  { date: "2025-02-03", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — Feb campaigns", amount: "2800.00" },
  { date: "2025-02-03", divisionId: pmg!.id, category: "Advertising", description: "Google Ads — Feb lead generation", amount: "2000.00" },
  { date: "2025-02-07", divisionId: tes!.id, category: "Transport", description: "Client visits — Pretoria & Centurion", amount: "750.00" },
  { date: "2025-02-10", divisionId: tes!.id, category: "Printing", description: "Tender document printing — Feb bids", amount: "480.00" },
  { date: "2025-02-12", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees", amount: "450.00" },
  { date: "2025-02-15", divisionId: aws!.id, category: "Software", description: "Adobe CC + Figma Pro licences", amount: "780.00" },
  { date: "2025-02-20", divisionId: aws!.id, category: "Freelancers", description: "Freelance copywriter — website content writing", amount: "1800.00" },

  // ────────────────────────────────────────────────────────────────────────
  // MARCH 2025
  // ────────────────────────────────────────────────────────────────────────
  { date: "2025-03-01", divisionId: pmg!.id, category: "Software", description: "Canva Pro subscription", amount: "350.00" },
  { date: "2025-03-01", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB — Mar", amount: "890.00" },
  { date: "2025-03-03", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — Q1 campaign push", amount: "3500.00" },
  { date: "2025-03-03", divisionId: pmg!.id, category: "Advertising", description: "Google Ads — Mar lead generation", amount: "3000.00" },
  { date: "2025-03-05", divisionId: tes!.id, category: "Transport", description: "Client site visit — Limpopo (Steyn Civil bid)", amount: "1800.00" },
  { date: "2025-03-07", divisionId: tes!.id, category: "Printing", description: "Tender printing — 4 large bid submissions", amount: "750.00" },
  { date: "2025-03-10", divisionId: pmg!.id, category: "Equipment", description: "Monitor upgrade — design workstation", amount: "2500.00" },
  { date: "2025-03-12", divisionId: aws!.id, category: "Software", description: "Adobe CC + Figma Pro + GitHub Pro", amount: "1200.00" },
  { date: "2025-03-15", divisionId: aws!.id, category: "Freelancers", description: "Freelance developer — client portal project support", amount: "3500.00" },
  { date: "2025-03-20", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CIDB portal fees — March batch", amount: "550.00" },
  { date: "2025-03-25", divisionId: aws!.id, category: "Freelancers", description: "Freelance photographer — client content shoot", amount: "1800.00" },

]);

console.log("  ✓ expenses");

// ── Leads ─────────────────────────────────────────────────────────────────────
await db.insert(leads).values([
  // New
  {
    name: "Thabo Mokoena",
    email: "thabo@mokoenabuilds.co.za",
    phone: "0731112233",
    source: "WhatsApp",
    serviceInterest: "Tender document compilation",
    status: "new",
    divisionId: tes!.id,
  },
  {
    name: "Nomsa Khumalo",
    phone: "0799990011",
    source: "WhatsApp",
    serviceInterest: "Social media management",
    status: "new",
    divisionId: pmg!.id,
  },
  {
    name: "Kagiso Sithole",
    email: "kagiso.sithole@outlook.com",
    phone: "0835552211",
    source: "Google",
    serviceInterest: "CSD registration + B-BBEE affidavit",
    status: "new",
    divisionId: tes!.id,
  },
  {
    name: "Mbali Dlamini",
    email: "mbali@dlaminiservices.co.za",
    phone: "0826663344",
    source: "Referral",
    serviceInterest: "Business website build",
    status: "new",
    divisionId: aws!.id,
  },
  // Contacted
  {
    name: "Fatima Essop",
    email: "fatima.essop@gmail.com",
    phone: "0844445566",
    source: "Referral",
    serviceInterest: "CSD registration",
    status: "contacted",
    divisionId: tes!.id,
  },
  {
    name: "Wayne Olivier",
    email: "wayne.olivier@wayneco.co.za",
    phone: "0729988776",
    source: "LinkedIn",
    serviceInterest: "Monthly social media retainer",
    status: "contacted",
    divisionId: pmg!.id,
  },
  {
    name: "Tebogo Nkosi",
    email: "tebogo@nkosigroup.co.za",
    phone: "0813344556",
    source: "Google",
    serviceInterest: "Website + Growth package",
    status: "contacted",
    divisionId: aws!.id,
  },
  {
    name: "Chantelle Ferreira",
    email: "chantelle.f@ferreiraplumbing.co.za",
    phone: "0844556677",
    source: "WhatsApp",
    serviceInterest: "Tender-Ready Starter bundle",
    status: "contacted",
    divisionId: tes!.id,
  },
  // Converted
  {
    name: "Ruan Botha",
    email: "ruan@bothatech.co.za",
    phone: "0617778899",
    source: "Google",
    serviceInterest: "Website + Growth package",
    status: "converted",
    divisionId: aws!.id,
  },
  {
    name: "Lindiwe Mthembu",
    email: "lindiwe@mthembucontracting.co.za",
    phone: "0838899001",
    source: "Referral",
    serviceInterest: "Tender-Ready Professional bundle",
    status: "converted",
    divisionId: tes!.id,
  },
  {
    name: "Pieter van Wyk",
    email: "pieter@vanwykplastering.co.za",
    phone: "0827766554",
    source: "WhatsApp",
    serviceInterest: "CIDB grading + full tender compliance",
    status: "converted",
    divisionId: tes!.id,
  },
  {
    name: "Siyanda Cele",
    email: "siyanda.cele@gmail.com",
    phone: "0749900112",
    source: "Instagram",
    serviceInterest: "Brand identity & company profile",
    status: "converted",
    divisionId: pmg!.id,
  },
  // Lost
  {
    name: "Derek Pietersen",
    email: "derek.p@outlook.com",
    phone: "0823334455",
    source: "Instagram",
    serviceInterest: "Logo & brand identity",
    status: "lost",
    divisionId: aws!.id,
  },
  {
    name: "Mpho Ramahlele",
    email: "mpho.r@mphoservices.co.za",
    phone: "0765544332",
    source: "Facebook",
    serviceInterest: "Full tender compilation",
    status: "lost",
    divisionId: tes!.id,
  },
  {
    name: "Sandra Jacobs",
    email: "sandra.jacobs@sjenterprises.co.za",
    phone: "0834433221",
    source: "Google",
    serviceInterest: "Website build",
    status: "lost",
    divisionId: aws!.id,
  },
]);

console.log("  ✓ leads");

console.log(`
✅ Seed complete.

   Divisions  : 3
   Clients    : 7
   Pricing    : 5 packages
   Income     : ~120 entries across 6 months (Oct 2024 – Mar 2025)
   Expenses   : ~54 entries across 6 months
   Leads      : 15  (4 new · 4 contacted · 4 converted · 3 lost)

   Monthly revenue (approx):
     Oct 2024 → R 65,850
     Nov 2024 → R 82,450
     Dec 2024 → R 54,250
     Jan 2025 → R 88,400
     Feb 2025 → R 85,350
     Mar 2025 → R137,700
                ────────
     6-month total → R513,000
`);

await client.end();