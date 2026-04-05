// packages/db/src/seed.ts
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { divisions, clients, income, expenses, leads, withdrawals, awsPricing, snapshots, expenseCategories } from "./schema";
import { getFinancialSummaryForPeriod } from "./queries";

config({ path: resolve(__dirname, "../.env") });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  ssl: { rejectUnauthorized: true },
});
await client.connect();
const db = drizzle(client);

console.log("🌱 Seeding database...");

// ── Divisions ────────────────────────────────────────────────────────────────
// Use onConflictDoNothing() (unique on name) then query back to get IDs.
await db
  .insert(divisions)
  .values([
    { name: "Playhouse Media Group" },
    { name: "Tender Edge Solutions" },
    { name: "Apex Web Solutions" },
  ])
  .onConflictDoNothing();

const divisionRows = await db.select().from(divisions);
const pmg  = divisionRows.find((d) => d.name === "Playhouse Media Group")!;
const tes  = divisionRows.find((d) => d.name === "Tender Edge Solutions")!;
const aws  = divisionRows.find((d) => d.name === "Apex Web Solutions")!;

console.log("  ✓ divisions");

// ── Expense Categories ────────────────────────────────────────────────────────
await db
  .insert(expenseCategories)
  .values([
    { name: "Advertising" },
    { name: "Equipment" },
    { name: "Freelancers" },
    { name: "General" },
    { name: "Hosting" },
    { name: "Printing" },
    { name: "Professional Services" },
    { name: "Software" },
    { name: "Transport" },
  ])
  .onConflictDoNothing();

console.log("  ✓ expense_categories");

// ── Clients ──────────────────────────────────────────────────────────────────
// Use onConflictDoNothing() (unique on email) then query back to get IDs.
await db
  .insert(clients)
  .values([
    { name: "Sipho Dlamini",      businessName: "Dlamini Construction CC",       email: "sipho@dlaminicc.co.za",         phone: "0821234567" },
    { name: "Priya Naidoo",       businessName: "Naidoo Logistics (Pty) Ltd",    email: "priya@naidoolog.co.za",         phone: "0839876543" },
    { name: "Johan van der Merwe",businessName: "VDM Electrical",                email: "johan@vdmelectrical.co.za",     phone: "0764561234" },
    { name: "Lungelo Zulu",       businessName: "Zulu Security Services",        email: "lungelo@zulusecurity.co.za",    phone: "0731234567" },
    { name: "Aisha Mohamed",      businessName: "Mohamed Cleaning Solutions",    email: "aisha@mohamedcleaning.co.za",   phone: "0844567890" },
    { name: "Zanele Mthembu",     businessName: "Mthembu Property Group",        email: "zanele@mthembuproperty.co.za",  phone: "0617890123" },
    { name: "Riaan Steyn",        businessName: "Steyn Civil Engineering",       email: "riaan@steyncivil.co.za",        phone: "0829013456" },
    { name: "Tebogo Nkosi",       businessName: "Nkosi Group Holdings",          email: "tebogo@nkosigroup.co.za",       phone: "0813344556" },
    { name: "Chantelle Ferreira", businessName: "Ferreira Plumbing & Gas",       email: "chantelle@ferreiraplumbing.co.za", phone: "0844556677" },
  ])
  .onConflictDoNothing();

const clientRows = await db.select().from(clients);
const clientA = clientRows.find((c) => c.email === "sipho@dlaminicc.co.za")!;
const clientB = clientRows.find((c) => c.email === "priya@naidoolog.co.za")!;
const clientC = clientRows.find((c) => c.email === "johan@vdmelectrical.co.za")!;
const clientD = clientRows.find((c) => c.email === "lungelo@zulusecurity.co.za")!;
const clientE = clientRows.find((c) => c.email === "aisha@mohamedcleaning.co.za")!;
const clientF = clientRows.find((c) => c.email === "zanele@mthembuproperty.co.za")!;
const clientG = clientRows.find((c) => c.email === "riaan@steyncivil.co.za")!;
const clientH = clientRows.find((c) => c.email === "tebogo@nkosigroup.co.za")!;
const clientI = clientRows.find((c) => c.email === "chantelle@ferreiraplumbing.co.za")!;

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
    features: ["Up to 5 pages", "Google Ads management", "Social media scheduling", "Bi-weekly report", "Priority support"],
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
    features: ["Unlimited pages", "Full ad management", "Content creation", "Weekly strategy call", "Dedicated account manager"],
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
    features: ["Logo design (3 concepts)", "Brand colour palette", "Typography guide", "Business card design", "All source files"],
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
    features: ["Up to 8 pages", "Mobile responsive", "Contact form", "Basic SEO", "1 month free support"],
    cta: "Build My Site",
    popular: false,
    type: "once_off",
    sortOrder: 5,
  },
]).onConflictDoNothing();

console.log("  ✓ aws_pricing");

// ── Income (Apr 2025 – Mar 2026) ─────────────────────────────────────────────
//
// Monthly revenue (all 3 divisions combined, showing growth trend):
//   Apr 2025 → ~R128,000   May 2025 → ~R142,500   Jun 2025 → ~R118,000
//   Jul 2025 → ~R155,000   Aug 2025 → ~R168,500   Sep 2025 → ~R175,000
//   Oct 2025 → ~R192,000   Nov 2025 → ~R210,000   Dec 2025 → ~R145,000
//   Jan 2026 → ~R220,000   Feb 2026 → ~R235,000   Mar 2026 → ~R258,000
//
// Guard: only insert if no income rows exist yet (income has no natural unique key).
const existingIncomeCount = await db.select().from(income).limit(1);
if (existingIncomeCount.length === 0) {
await db.insert(income).values([

  // ────────────────────────────────────────────────────────────────────────
  // APRIL 2025 — Total ~R128,000
  // PMG: R38,000  |  TES: R40,000  |  AWS: R50,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-04-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Apr", amount: "3500.00" },
  { date: "2025-04-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Apr", amount: "4000.00" },
  { date: "2025-04-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Apr", amount: "4000.00" },
  { date: "2025-04-01", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Apr", amount: "4000.00" },
  { date: "2025-04-01", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Apr", amount: "4500.00" },
  { date: "2025-04-08", divisionId: pmg!.id, clientId: clientB!.id, description: "Q2 marketing strategy & content calendar", amount: "8500.00" },
  { date: "2025-04-15", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Apr", amount: "4000.00" },
  { date: "2025-04-22", divisionId: pmg!.id, clientId: clientI!.id, description: "Brand identity package — Ferreira Plumbing", amount: "5500.00" },

  // TES
  { date: "2025-04-01", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Apr", amount: "1500.00" },
  { date: "2025-04-01", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Apr", amount: "1500.00" },
  { date: "2025-04-01", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Apr", amount: "1500.00" },
  { date: "2025-04-03", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — KZN roads bid", amount: "4500.00" },
  { date: "2025-04-07", divisionId: tes!.id, clientId: clientC!.id, description: "Full tender compilation — electrical infrastructure Apr", amount: "4500.00" },
  { date: "2025-04-10", divisionId: tes!.id, clientId: clientH!.id, description: "Tender-Ready Professional bundle — Nkosi Group", amount: "5500.00" },
  { date: "2025-04-14", divisionId: tes!.id, clientId: clientI!.id, description: "CSD registration + COIDA + B-BBEE affidavit", amount: "2500.00" },
  { date: "2025-04-17", divisionId: tes!.id, clientId: clientF!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2025-04-22", divisionId: tes!.id, clientId: clientD!.id, description: "CIDB Grade 3 upgrade application", amount: "1800.00" },
  { date: "2025-04-25", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation & pricing support", amount: "3000.00" },
  { date: "2025-04-28", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms pack + Tax Clearance PIN", amount: "950.00" },
  { date: "2025-04-30", divisionId: tes!.id, clientId: clientA!.id, description: "Municipal supplier database registration", amount: "500.00" },

  // AWS
  { date: "2025-04-01", divisionId: aws!.id, clientId: clientB!.id, description: "Growth package — Apr", amount: "3500.00" },
  { date: "2025-04-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Apr", amount: "450.00" },
  { date: "2025-04-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Apr", amount: "3500.00" },
  { date: "2025-04-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Apr", amount: "1500.00" },
  { date: "2025-04-01", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Apr", amount: "750.00" },
  { date: "2025-04-01", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Apr", amount: "1200.00" },
  { date: "2025-04-01", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Apr", amount: "7500.00" },
  { date: "2025-04-07", divisionId: aws!.id, clientId: clientH!.id, description: "Business website build — Nkosi Group Holdings", amount: "12000.00" },
  { date: "2025-04-14", divisionId: aws!.id, clientId: clientI!.id, description: "Website build — Ferreira Plumbing & Gas", amount: "12000.00" },
  { date: "2025-04-21", divisionId: aws!.id, clientId: clientC!.id, description: "SEO audit + Google Ads campaign setup", amount: "3500.00" },
  { date: "2025-04-28", divisionId: aws!.id, clientId: clientD!.id, description: "Website redesign — Zulu Security Services v2", amount: "4150.00" },

  // ────────────────────────────────────────────────────────────────────────
  // MAY 2025 — Total ~R142,500
  // PMG: R42,000  |  TES: R44,500  |  AWS: R56,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-05-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — May", amount: "3500.00" },
  { date: "2025-05-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — May", amount: "4000.00" },
  { date: "2025-05-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — May", amount: "4000.00" },
  { date: "2025-05-01", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — May", amount: "4000.00" },
  { date: "2025-05-01", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — May", amount: "4500.00" },
  { date: "2025-05-01", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — May", amount: "4000.00" },
  { date: "2025-05-12", divisionId: pmg!.id, clientId: clientB!.id, description: "Mid-year brand campaign — video content production", amount: "12000.00" },
  { date: "2025-05-20", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — May", amount: "4000.00" },
  { date: "2025-05-26", divisionId: pmg!.id, clientId: clientC!.id, description: "Company profile redesign — VDM Electrical", amount: "2000.00" },

  // TES
  { date: "2025-05-01", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — May", amount: "1500.00" },
  { date: "2025-05-01", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — May", amount: "1500.00" },
  { date: "2025-05-01", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — May", amount: "1500.00" },
  { date: "2025-05-01", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — May", amount: "1500.00" },
  { date: "2025-05-06", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Mpumalanga infrastructure", amount: "4500.00" },
  { date: "2025-05-09", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Gauteng roads Q2", amount: "4500.00" },
  { date: "2025-05-13", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-05-16", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing services bid", amount: "4200.00" },
  { date: "2025-05-20", divisionId: tes!.id, clientId: clientC!.id, description: "CIDB Grade 2 application", amount: "1800.00" },
  { date: "2025-05-23", divisionId: tes!.id, clientId: clientD!.id, description: "BoQ preparation & pricing support", amount: "3000.00" },
  { date: "2025-05-27", divisionId: tes!.id, clientId: clientA!.id, description: "COIDA renewal + Tax Clearance PIN", amount: "800.00" },
  { date: "2025-05-29", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms pack — additional bid", amount: "950.00" },
  { date: "2025-05-30", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Q2 bid", amount: "4500.00" },
  { date: "2025-05-30", divisionId: tes!.id, clientId: clientE!.id, description: "Municipal supplier database renewal", amount: "500.00" },

  // AWS
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — May", amount: "7500.00" },
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — May", amount: "450.00" },
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — May", amount: "3500.00" },
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — May", amount: "1500.00" },
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — May", amount: "750.00" },
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — May", amount: "1200.00" },
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — May", amount: "3500.00" },
  { date: "2025-05-01", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — May", amount: "750.00" },
  { date: "2025-05-08", divisionId: aws!.id, clientId: clientC!.id, description: "E-commerce store upgrade — VDM Electrical", amount: "8500.00" },
  { date: "2025-05-15", divisionId: aws!.id, clientId: clientF!.id, description: "Website redesign — Mthembu Property Group", amount: "12000.00" },
  { date: "2025-05-22", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads management + SEO — May", amount: "3500.00" },
  { date: "2025-05-28", divisionId: aws!.id, clientId: clientH!.id, description: "Custom landing pages — Nkosi Group campaign", amount: "6350.00" },

  // ────────────────────────────────────────────────────────────────────────
  // JUNE 2025 — Total ~R118,000  (mid-year dip)
  // PMG: R32,000  |  TES: R36,000  |  AWS: R50,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-06-02", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Jun", amount: "3500.00" },
  { date: "2025-06-02", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Jun", amount: "4000.00" },
  { date: "2025-06-02", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Jun", amount: "4000.00" },
  { date: "2025-06-02", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Jun", amount: "4000.00" },
  { date: "2025-06-02", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Jun", amount: "4500.00" },
  { date: "2025-06-02", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Jun", amount: "4000.00" },
  { date: "2025-06-02", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Jun", amount: "4000.00" },
  { date: "2025-06-18", divisionId: pmg!.id, clientId: clientB!.id, description: "Mid-year marketing review & strategy refresh", amount: "4000.00" },

  // TES
  { date: "2025-06-02", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Jun", amount: "1500.00" },
  { date: "2025-06-02", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Jun", amount: "1500.00" },
  { date: "2025-06-02", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Jun", amount: "1500.00" },
  { date: "2025-06-02", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Jun", amount: "1500.00" },
  { date: "2025-06-05", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — North West roads bid", amount: "4500.00" },
  { date: "2025-06-10", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing infrastructure Jun", amount: "4200.00" },
  { date: "2025-06-13", divisionId: tes!.id, clientId: clientC!.id, description: "Tender-Ready Starter bundle", amount: "2500.00" },
  { date: "2025-06-18", divisionId: tes!.id, clientId: clientF!.id, description: "BoQ preparation & pricing support", amount: "3000.00" },
  { date: "2025-06-23", divisionId: tes!.id, clientId: clientD!.id, description: "B-BBEE affidavit renewal", amount: "550.00" },
  { date: "2025-06-25", divisionId: tes!.id, clientId: clientA!.id, description: "CIDB Grade 2 upgrade application", amount: "1800.00" },
  { date: "2025-06-27", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms pack + COIDA letter", amount: "950.00" },
  { date: "2025-06-30", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Jun bid", amount: "4500.00" },
  { date: "2025-06-30", divisionId: tes!.id, clientId: clientE!.id, description: "Tax Clearance PIN + SARS eFiling assistance", amount: "500.00" },

  // AWS
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Jun", amount: "7500.00" },
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Jun", amount: "450.00" },
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Jun", amount: "3500.00" },
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Jun", amount: "1500.00" },
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Jun", amount: "750.00" },
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Jun", amount: "1200.00" },
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Jun", amount: "3500.00" },
  { date: "2025-06-02", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Jun", amount: "750.00" },
  { date: "2025-06-10", divisionId: aws!.id, clientId: clientC!.id, description: "Annual SEO audit + content refresh", amount: "3500.00" },
  { date: "2025-06-17", divisionId: aws!.id, clientId: clientF!.id, description: "Google Ads management — Jun", amount: "2500.00" },
  { date: "2025-06-24", divisionId: aws!.id, clientId: clientD!.id, description: "Website performance optimisation", amount: "2000.00" },
  { date: "2025-06-27", divisionId: aws!.id, clientId: clientH!.id, description: "E-commerce store build — Nkosi Group online shop", amount: "15000.00" },
  { date: "2025-06-30", divisionId: aws!.id, clientId: clientI!.id, description: "Website upgrade — Ferreira Plumbing", amount: "7350.00" },

  // ────────────────────────────────────────────────────────────────────────
  // JULY 2025 — Total ~R155,000
  // PMG: R45,000  |  TES: R48,000  |  AWS: R62,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-07-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Jul", amount: "3500.00" },
  { date: "2025-07-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Jul", amount: "4000.00" },
  { date: "2025-07-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Jul", amount: "4000.00" },
  { date: "2025-07-01", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Jul", amount: "4000.00" },
  { date: "2025-07-01", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Jul", amount: "4500.00" },
  { date: "2025-07-01", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Jul", amount: "4000.00" },
  { date: "2025-07-01", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Jul", amount: "4000.00" },
  { date: "2025-07-10", divisionId: pmg!.id, clientId: clientB!.id, description: "Q3 marketing campaign — paid ads & influencer content", amount: "13000.00" },
  { date: "2025-07-21", divisionId: pmg!.id, clientId: clientC!.id, description: "Brand refresh — VDM Electrical", amount: "4000.00" },

  // TES
  { date: "2025-07-01", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Jul", amount: "1500.00" },
  { date: "2025-07-01", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Jul", amount: "1500.00" },
  { date: "2025-07-01", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Jul", amount: "1500.00" },
  { date: "2025-07-01", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Jul", amount: "1500.00" },
  { date: "2025-07-01", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Jul", amount: "1500.00" },
  { date: "2025-07-04", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Limpopo water infrastructure", amount: "4500.00" },
  { date: "2025-07-07", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Jul", amount: "4500.00" },
  { date: "2025-07-10", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-07-14", divisionId: tes!.id, clientId: clientC!.id, description: "Full tender compilation — electrical Jul", amount: "4500.00" },
  { date: "2025-07-17", divisionId: tes!.id, clientId: clientD!.id, description: "CIDB Grade 3–4 upgrade application", amount: "2200.00" },
  { date: "2025-07-21", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Jul bid", amount: "4500.00" },
  { date: "2025-07-24", divisionId: tes!.id, clientId: clientI!.id, description: "BoQ preparation — plumbing bid package", amount: "3000.00" },
  { date: "2025-07-28", divisionId: tes!.id, clientId: clientA!.id, description: "COIDA renewal + municipal registration", amount: "800.00" },
  { date: "2025-07-30", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms + additional compliance documents", amount: "1000.00" },

  // AWS
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Jul", amount: "7500.00" },
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Jul", amount: "450.00" },
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Jul", amount: "3500.00" },
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Jul", amount: "1500.00" },
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Jul", amount: "750.00" },
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Jul", amount: "1200.00" },
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Jul", amount: "3500.00" },
  { date: "2025-07-01", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Jul", amount: "750.00" },
  { date: "2025-07-07", divisionId: aws!.id, clientId: clientC!.id, description: "Custom web app — VDM Electrical phase 2", amount: "18000.00" },
  { date: "2025-07-14", divisionId: aws!.id, clientId: clientF!.id, description: "E-commerce store build — Mthembu Property v2", amount: "15000.00" },
  { date: "2025-07-21", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads + SEO management — Jul", amount: "3500.00" },
  { date: "2025-07-28", divisionId: aws!.id, clientId: clientH!.id, description: "Website redesign — Nkosi Group Holdings", amount: "5850.00" },

  // ────────────────────────────────────────────────────────────────────────
  // AUGUST 2025 — Total ~R168,500
  // PMG: R50,000  |  TES: R52,000  |  AWS: R66,500
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-08-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Aug", amount: "3500.00" },
  { date: "2025-08-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Aug", amount: "4000.00" },
  { date: "2025-08-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Aug", amount: "4000.00" },
  { date: "2025-08-01", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Aug", amount: "4000.00" },
  { date: "2025-08-01", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Aug", amount: "4500.00" },
  { date: "2025-08-01", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Aug", amount: "4000.00" },
  { date: "2025-08-01", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Aug", amount: "4000.00" },
  { date: "2025-08-11", divisionId: pmg!.id, clientId: clientB!.id, description: "Women's Month campaign — content & paid ads", amount: "14000.00" },
  { date: "2025-08-20", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Aug", amount: "4000.00" },
  { date: "2025-08-25", divisionId: pmg!.id, clientId: clientD!.id, description: "Promotional video production — Zulu Security", amount: "4000.00" },

  // TES
  { date: "2025-08-01", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Aug", amount: "1500.00" },
  { date: "2025-08-01", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Aug", amount: "1500.00" },
  { date: "2025-08-01", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Aug", amount: "1500.00" },
  { date: "2025-08-01", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Aug", amount: "1500.00" },
  { date: "2025-08-01", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Aug", amount: "1500.00" },
  { date: "2025-08-05", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Eastern Cape roads bid", amount: "4500.00" },
  { date: "2025-08-08", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Aug", amount: "4500.00" },
  { date: "2025-08-12", divisionId: tes!.id, clientId: clientF!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2025-08-15", divisionId: tes!.id, clientId: clientC!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-08-19", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Aug bid", amount: "4500.00" },
  { date: "2025-08-22", divisionId: tes!.id, clientId: clientD!.id, description: "BoQ preparation & pricing support", amount: "3000.00" },
  { date: "2025-08-26", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing services Aug", amount: "4200.00" },
  { date: "2025-08-29", divisionId: tes!.id, clientId: clientA!.id, description: "SBD forms + B-BBEE affidavit renewal", amount: "1100.00" },

  // AWS
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Aug", amount: "7500.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Aug", amount: "450.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Aug", amount: "3500.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Aug", amount: "1500.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Aug", amount: "750.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Aug", amount: "1200.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Aug", amount: "3500.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Aug", amount: "750.00" },
  { date: "2025-08-01", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Aug", amount: "3500.00" },
  { date: "2025-08-11", divisionId: aws!.id, clientId: clientF!.id, description: "Custom booking system — Mthembu Property", amount: "20000.00" },
  { date: "2025-08-18", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads + SEO management — Aug", amount: "3500.00" },
  { date: "2025-08-25", divisionId: aws!.id, clientId: clientH!.id, description: "E-commerce store upgrade — Nkosi Group", amount: "8350.00" },
  { date: "2025-08-29", divisionId: aws!.id, clientId: clientI!.id, description: "Website redesign — Ferreira Plumbing v2", amount: "8000.00" },

  // ────────────────────────────────────────────────────────────────────────
  // SEPTEMBER 2025 — Total ~R175,000
  // PMG: R52,000  |  TES: R55,000  |  AWS: R68,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Sep", amount: "3500.00" },
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Sep", amount: "4000.00" },
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Sep", amount: "4000.00" },
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Sep", amount: "4000.00" },
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Sep", amount: "4500.00" },
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Sep", amount: "4000.00" },
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Sep", amount: "4000.00" },
  { date: "2025-09-01", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Sep", amount: "4000.00" },
  { date: "2025-09-10", divisionId: pmg!.id, clientId: clientB!.id, description: "Heritage Month campaign — content & paid ads", amount: "12000.00" },
  { date: "2025-09-22", divisionId: pmg!.id, clientId: clientG!.id, description: "Corporate video production — Steyn Civil", amount: "8000.00" },

  // TES
  { date: "2025-09-01", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Sep", amount: "1500.00" },
  { date: "2025-09-01", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Sep", amount: "1500.00" },
  { date: "2025-09-01", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Sep", amount: "1500.00" },
  { date: "2025-09-01", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Sep", amount: "1500.00" },
  { date: "2025-09-01", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Sep", amount: "1500.00" },
  { date: "2025-09-04", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Free State infrastructure", amount: "4500.00" },
  { date: "2025-09-08", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Sep", amount: "4500.00" },
  { date: "2025-09-11", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-09-15", divisionId: tes!.id, clientId: clientC!.id, description: "Full tender compilation — electrical Sep", amount: "4500.00" },
  { date: "2025-09-18", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Sep bid", amount: "4500.00" },
  { date: "2025-09-22", divisionId: tes!.id, clientId: clientD!.id, description: "CIDB Grade 4 upgrade application", amount: "2500.00" },
  { date: "2025-09-25", divisionId: tes!.id, clientId: clientI!.id, description: "BoQ preparation — plumbing Sep bid", amount: "3000.00" },
  { date: "2025-09-29", divisionId: tes!.id, clientId: clientA!.id, description: "Annual compliance audit & document refresh", amount: "2000.00" },
  { date: "2025-09-30", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms + COIDA renewal", amount: "1000.00" },

  // AWS
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Sep", amount: "7500.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Sep", amount: "450.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Sep", amount: "3500.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Sep", amount: "1500.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Sep", amount: "750.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Sep", amount: "1200.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Sep", amount: "3500.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Sep", amount: "750.00" },
  { date: "2025-09-01", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Sep", amount: "3500.00" },
  { date: "2025-09-08", divisionId: aws!.id, clientId: clientC!.id, description: "Custom web portal — VDM Electrical phase 3", amount: "15000.00" },
  { date: "2025-09-15", divisionId: aws!.id, clientId: clientF!.id, description: "Google Ads management + SEO — Sep", amount: "3500.00" },
  { date: "2025-09-22", divisionId: aws!.id, clientId: clientH!.id, description: "Website redesign — Nkosi Group v2", amount: "12000.00" },
  { date: "2025-09-29", divisionId: aws!.id, clientId: clientD!.id, description: "E-commerce store build — Zulu Security online shop", amount: "8350.00" },

  // ────────────────────────────────────────────────────────────────────────
  // OCTOBER 2025 — Total ~R192,000
  // PMG: R58,000  |  TES: R62,000  |  AWS: R72,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Oct", amount: "3500.00" },
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Oct", amount: "4000.00" },
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Oct", amount: "4000.00" },
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Oct", amount: "4000.00" },
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Oct", amount: "4500.00" },
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Oct", amount: "4000.00" },
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Oct", amount: "4000.00" },
  { date: "2025-10-01", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Oct", amount: "4000.00" },
  { date: "2025-10-08", divisionId: pmg!.id, clientId: clientB!.id, description: "Q4 marketing campaign — paid ads & content production", amount: "15000.00" },
  { date: "2025-10-20", divisionId: pmg!.id, clientId: clientE!.id, description: "Brand identity refresh — Mohamed Cleaning", amount: "6000.00" },
  { date: "2025-10-27", divisionId: pmg!.id, clientId: clientG!.id, description: "Promotional video — Steyn Civil Q4", amount: "5000.00" },

  // TES
  { date: "2025-10-01", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Oct", amount: "1500.00" },
  { date: "2025-10-01", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Oct", amount: "1500.00" },
  { date: "2025-10-01", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Oct", amount: "1500.00" },
  { date: "2025-10-01", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Oct", amount: "1500.00" },
  { date: "2025-10-01", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Oct", amount: "1500.00" },
  { date: "2025-10-06", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Gauteng roads Q4", amount: "4500.00" },
  { date: "2025-10-09", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Oct", amount: "4500.00" },
  { date: "2025-10-13", divisionId: tes!.id, clientId: clientF!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2025-10-16", divisionId: tes!.id, clientId: clientC!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-10-20", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Oct bid", amount: "4500.00" },
  { date: "2025-10-23", divisionId: tes!.id, clientId: clientD!.id, description: "BoQ preparation — two bid packages", amount: "6000.00" },
  { date: "2025-10-27", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing Oct", amount: "4200.00" },
  { date: "2025-10-29", divisionId: tes!.id, clientId: clientA!.id, description: "COIDA renewal + SARS Tax Clearance", amount: "1800.00" },
  { date: "2025-10-31", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms + compliance documents Oct", amount: "1300.00" },

  // AWS
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Oct", amount: "7500.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Oct", amount: "450.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Oct", amount: "3500.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Oct", amount: "1500.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Oct", amount: "750.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Oct", amount: "1200.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Oct", amount: "3500.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Oct", amount: "750.00" },
  { date: "2025-10-01", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Oct", amount: "3500.00" },
  { date: "2025-10-08", divisionId: aws!.id, clientId: clientF!.id, description: "Custom property listing platform — Mthembu", amount: "22000.00" },
  { date: "2025-10-15", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads + SEO management — Oct", amount: "3500.00" },
  { date: "2025-10-22", divisionId: aws!.id, clientId: clientH!.id, description: "E-commerce store build — Nkosi Group v2", amount: "15000.00" },
  { date: "2025-10-29", divisionId: aws!.id, clientId: clientI!.id, description: "Website upgrade + booking system — Ferreira", amount: "8350.00" },

  // ────────────────────────────────────────────────────────────────────────
  // NOVEMBER 2025 — Total ~R210,000
  // PMG: R62,000  |  TES: R68,000  |  AWS: R80,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Nov", amount: "3500.00" },
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Nov", amount: "4500.00" },
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2025-11-03", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Nov", amount: "4000.00" },
  { date: "2025-11-10", divisionId: pmg!.id, clientId: clientB!.id, description: "Black Friday campaign — paid ads & content", amount: "18000.00" },
  { date: "2025-11-24", divisionId: pmg!.id, clientId: clientE!.id, description: "Year-end brand campaign — Mohamed Cleaning", amount: "8000.00" },
  { date: "2025-11-28", divisionId: pmg!.id, clientId: clientG!.id, description: "Corporate photography & content shoot", amount: "4000.00" },

  // TES
  { date: "2025-11-03", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2025-11-03", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2025-11-03", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2025-11-03", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2025-11-03", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Nov", amount: "1500.00" },
  { date: "2025-11-06", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Western Cape infrastructure", amount: "4500.00" },
  { date: "2025-11-10", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Nov", amount: "4500.00" },
  { date: "2025-11-13", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2025-11-17", divisionId: tes!.id, clientId: clientC!.id, description: "Full tender compilation — electrical Nov", amount: "4500.00" },
  { date: "2025-11-20", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Nov bid", amount: "4500.00" },
  { date: "2025-11-24", divisionId: tes!.id, clientId: clientD!.id, description: "BoQ preparation — three bid packages", amount: "9000.00" },
  { date: "2025-11-27", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing Nov", amount: "4200.00" },
  { date: "2025-11-28", divisionId: tes!.id, clientId: clientA!.id, description: "Annual compliance package renewal", amount: "2000.00" },
  { date: "2025-11-28", divisionId: tes!.id, clientId: clientB!.id, description: "CIDB Grade 3 upgrade application", amount: "2200.00" },
  { date: "2025-11-28", divisionId: tes!.id, clientId: clientE!.id, description: "SBD forms + Tax Clearance PIN", amount: "800.00" },

  // AWS
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Nov", amount: "7500.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Nov", amount: "450.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Nov", amount: "3500.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Nov", amount: "1500.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Nov", amount: "750.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Nov", amount: "1200.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Nov", amount: "3500.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Nov", amount: "750.00" },
  { date: "2025-11-03", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Nov", amount: "3500.00" },
  { date: "2025-11-10", divisionId: aws!.id, clientId: clientC!.id, description: "Custom web app — VDM Electrical phase 4", amount: "20000.00" },
  { date: "2025-11-17", divisionId: aws!.id, clientId: clientF!.id, description: "E-commerce store upgrade — Mthembu Property", amount: "12000.00" },
  { date: "2025-11-24", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads + SEO management — Nov", amount: "3500.00" },
  { date: "2025-11-28", divisionId: aws!.id, clientId: clientH!.id, description: "Custom CRM integration — Nkosi Group", amount: "15350.00" },

  // ────────────────────────────────────────────────────────────────────────
  // DECEMBER 2025 — Total ~R145,000  (holiday dip)
  // PMG: R40,000  |  TES: R42,000  |  AWS: R63,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Dec", amount: "3500.00" },
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Dec", amount: "4000.00" },
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Dec", amount: "4000.00" },
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Dec", amount: "4000.00" },
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Dec", amount: "4500.00" },
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Dec", amount: "4000.00" },
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Dec", amount: "4000.00" },
  { date: "2025-12-01", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Dec", amount: "4000.00" },
  { date: "2025-12-08", divisionId: pmg!.id, clientId: clientB!.id, description: "Festive season campaign — content & paid ads", amount: "8000.00" },

  // TES
  { date: "2025-12-01", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2025-12-01", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2025-12-01", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2025-12-01", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2025-12-01", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Dec", amount: "1500.00" },
  { date: "2025-12-05", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — year-end government bid", amount: "4500.00" },
  { date: "2025-12-08", divisionId: tes!.id, clientId: clientC!.id, description: "Tender-Ready Starter bundle", amount: "2500.00" },
  { date: "2025-12-10", divisionId: tes!.id, clientId: clientF!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2025-12-12", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Dec bid", amount: "4500.00" },
  { date: "2025-12-15", divisionId: tes!.id, clientId: clientD!.id, description: "Annual CSD profile renewal & update", amount: "350.00" },
  { date: "2025-12-17", divisionId: tes!.id, clientId: clientA!.id, description: "B-BBEE affidavit renewal", amount: "550.00" },
  { date: "2025-12-19", divisionId: tes!.id, clientId: clientB!.id, description: "COIDA letter of good standing", amount: "450.00" },
  { date: "2025-12-22", divisionId: tes!.id, clientId: clientI!.id, description: "SBD forms pack — year-end bid", amount: "950.00" },
  { date: "2025-12-29", divisionId: tes!.id, clientId: clientE!.id, description: "Tax Clearance PIN + SARS eFiling assistance", amount: "350.00" },
  { date: "2025-12-30", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation — year-end package", amount: "3000.00" },
  { date: "2025-12-30", divisionId: tes!.id, clientId: clientF!.id, description: "Municipal & provincial supplier registration renewal", amount: "500.00" },

  // AWS
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Dec", amount: "7500.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Dec", amount: "450.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Dec", amount: "3500.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Dec", amount: "1500.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Dec", amount: "750.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Dec", amount: "1200.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Dec", amount: "3500.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Dec", amount: "750.00" },
  { date: "2025-12-01", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Dec", amount: "3500.00" },
  { date: "2025-12-08", divisionId: aws!.id, clientId: clientC!.id, description: "Annual SEO audit + domain renewals — all clients", amount: "3500.00" },
  { date: "2025-12-15", divisionId: aws!.id, clientId: clientF!.id, description: "Website maintenance & performance audit", amount: "2500.00" },
  { date: "2025-12-19", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads year-end campaign", amount: "3500.00" },
  { date: "2025-12-22", divisionId: aws!.id, clientId: clientH!.id, description: "E-commerce store — festive season optimisation", amount: "8350.00" },
  { date: "2025-12-29", divisionId: aws!.id, clientId: clientI!.id, description: "Website redesign — Ferreira Plumbing v3", amount: "12000.00" },

  // ────────────────────────────────────────────────────────────────────────
  // JANUARY 2026 — Total ~R220,000
  // PMG: R65,000  |  TES: R72,000  |  AWS: R83,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Jan", amount: "3500.00" },
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Jan", amount: "4500.00" },
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2026-01-05", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Jan", amount: "4000.00" },
  { date: "2026-01-12", divisionId: pmg!.id, clientId: clientB!.id, description: "New year marketing campaign — strategy + content assets", amount: "16000.00" },
  { date: "2026-01-19", divisionId: pmg!.id, clientId: clientE!.id, description: "Full brand identity package — Mohamed Cleaning 2026", amount: "9500.00" },
  { date: "2026-01-26", divisionId: pmg!.id, clientId: clientG!.id, description: "Corporate video production — Steyn Civil Q1", amount: "7500.00" },

  // TES
  { date: "2026-01-05", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2026-01-05", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2026-01-05", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2026-01-05", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2026-01-05", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Jan", amount: "1500.00" },
  { date: "2026-01-07", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Gauteng infrastructure Q1", amount: "4500.00" },
  { date: "2026-01-09", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Jan", amount: "4500.00" },
  { date: "2026-01-12", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2026-01-14", divisionId: tes!.id, clientId: clientC!.id, description: "Full tender compilation — electrical Jan", amount: "4500.00" },
  { date: "2026-01-16", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Jan bid", amount: "4500.00" },
  { date: "2026-01-19", divisionId: tes!.id, clientId: clientD!.id, description: "CIDB Grade 4–5 upgrade application", amount: "2800.00" },
  { date: "2026-01-21", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing Jan", amount: "4200.00" },
  { date: "2026-01-23", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation — three bid packages", amount: "9000.00" },
  { date: "2026-01-26", divisionId: tes!.id, clientId: clientA!.id, description: "COIDA renewal + Tax Clearance PIN", amount: "800.00" },
  { date: "2026-01-28", divisionId: tes!.id, clientId: clientB!.id, description: "SBD forms + additional compliance documents", amount: "1200.00" },
  { date: "2026-01-30", divisionId: tes!.id, clientId: clientE!.id, description: "Annual compliance audit & document refresh", amount: "2000.00" },

  // AWS
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Jan", amount: "7500.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Jan", amount: "450.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Jan", amount: "3500.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Jan", amount: "1500.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Jan", amount: "750.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Jan", amount: "1200.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Jan", amount: "3500.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Jan", amount: "750.00" },
  { date: "2026-01-05", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Jan", amount: "3500.00" },
  { date: "2026-01-09", divisionId: aws!.id, clientId: clientC!.id, description: "Custom web app — VDM Electrical phase 5", amount: "22000.00" },
  { date: "2026-01-14", divisionId: aws!.id, clientId: clientF!.id, description: "E-commerce store rebuild — Mthembu Property 2026", amount: "18000.00" },
  { date: "2026-01-19", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads + SEO management — Jan", amount: "3500.00" },
  { date: "2026-01-23", divisionId: aws!.id, clientId: clientH!.id, description: "Custom ERP integration — Nkosi Group", amount: "15000.00" },
  { date: "2026-01-28", divisionId: aws!.id, clientId: clientI!.id, description: "Website redesign — Ferreira Plumbing 2026", amount: "5350.00" },

  // ────────────────────────────────────────────────────────────────────────
  // FEBRUARY 2026 — Total ~R235,000
  // PMG: R70,000  |  TES: R78,000  |  AWS: R87,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Feb", amount: "3500.00" },
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Feb", amount: "4500.00" },
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2026-02-02", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Feb", amount: "4000.00" },
  { date: "2026-02-09", divisionId: pmg!.id, clientId: clientB!.id, description: "Valentine's Day campaign — paid ads & content", amount: "12000.00" },
  { date: "2026-02-16", divisionId: pmg!.id, clientId: clientE!.id, description: "Brand refresh — Mohamed Cleaning 2026", amount: "9500.00" },
  { date: "2026-02-23", divisionId: pmg!.id, clientId: clientG!.id, description: "Corporate photography & content shoot — Feb", amount: "6500.00" },
  { date: "2026-02-27", divisionId: pmg!.id, clientId: clientC!.id, description: "Company profile redesign — VDM Electrical 2026", amount: "4000.00" },

  // TES
  { date: "2026-02-02", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2026-02-02", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2026-02-02", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2026-02-02", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2026-02-02", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Feb", amount: "1500.00" },
  { date: "2026-02-04", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — KZN infrastructure Feb", amount: "4500.00" },
  { date: "2026-02-06", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — civil works Feb", amount: "4500.00" },
  { date: "2026-02-09", divisionId: tes!.id, clientId: clientF!.id, description: "Full tender document compilation", amount: "4200.00" },
  { date: "2026-02-11", divisionId: tes!.id, clientId: clientC!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2026-02-13", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Feb bid", amount: "4500.00" },
  { date: "2026-02-16", divisionId: tes!.id, clientId: clientD!.id, description: "BoQ preparation — four bid packages", amount: "12000.00" },
  { date: "2026-02-18", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing Feb", amount: "4200.00" },
  { date: "2026-02-20", divisionId: tes!.id, clientId: clientA!.id, description: "COIDA renewal + SARS Tax Clearance", amount: "1800.00" },
  { date: "2026-02-23", divisionId: tes!.id, clientId: clientB!.id, description: "CIDB Grade 3–4 upgrade application", amount: "2500.00" },
  { date: "2026-02-25", divisionId: tes!.id, clientId: clientE!.id, description: "Annual compliance package renewal", amount: "2000.00" },
  { date: "2026-02-27", divisionId: tes!.id, clientId: clientF!.id, description: "SBD forms + B-BBEE affidavit renewal", amount: "1300.00" },

  // AWS
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Feb", amount: "7500.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Feb", amount: "450.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Feb", amount: "3500.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Feb", amount: "1500.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Feb", amount: "750.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Feb", amount: "1200.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Feb", amount: "3500.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Feb", amount: "750.00" },
  { date: "2026-02-02", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Feb", amount: "3500.00" },
  { date: "2026-02-09", divisionId: aws!.id, clientId: clientC!.id, description: "Custom web app — VDM Electrical phase 6", amount: "25000.00" },
  { date: "2026-02-16", divisionId: aws!.id, clientId: clientF!.id, description: "Property listing platform upgrade — Mthembu", amount: "15000.00" },
  { date: "2026-02-20", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads + SEO management — Feb", amount: "3500.00" },
  { date: "2026-02-23", divisionId: aws!.id, clientId: clientH!.id, description: "Custom analytics dashboard — Nkosi Group", amount: "18000.00" },
  { date: "2026-02-27", divisionId: aws!.id, clientId: clientI!.id, description: "E-commerce store build — Ferreira Plumbing parts shop", amount: "3550.00" },

  // ────────────────────────────────────────────────────────────────────────
  // MARCH 2026 — Total ~R258,000
  // PMG: R78,000  |  TES: R88,000  |  AWS: R92,000
  // ────────────────────────────────────────────────────────────────────────

  // PMG
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Mar", amount: "3500.00" },
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientD!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientF!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientG!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientH!.id, description: "Social media management — Mar", amount: "4500.00" },
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientE!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientI!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2026-03-02", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media management — Mar", amount: "4000.00" },
  { date: "2026-03-09", divisionId: pmg!.id, clientId: clientB!.id, description: "Q1 2026 marketing campaign — paid ads & content production", amount: "18000.00" },
  { date: "2026-03-16", divisionId: pmg!.id, clientId: clientE!.id, description: "Full brand identity package — Mohamed Cleaning 2026 refresh", amount: "9500.00" },
  { date: "2026-03-23", divisionId: pmg!.id, clientId: clientG!.id, description: "Corporate video production — Steyn Civil Q1 2026", amount: "10000.00" },
  { date: "2026-03-28", divisionId: pmg!.id, clientId: clientC!.id, description: "Social media audit & strategy — VDM Electrical", amount: "4500.00" },

  // TES
  { date: "2026-03-02", divisionId: tes!.id, clientId: clientA!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2026-03-02", divisionId: tes!.id, clientId: clientB!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2026-03-02", divisionId: tes!.id, clientId: clientE!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2026-03-02", divisionId: tes!.id, clientId: clientH!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2026-03-02", divisionId: tes!.id, clientId: clientI!.id, description: "Compliance maintenance retainer — Mar", amount: "1500.00" },
  { date: "2026-03-04", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Limpopo roads bid Mar", amount: "4500.00" },
  { date: "2026-03-06", divisionId: tes!.id, clientId: clientG!.id, description: "Full tender compilation — Centurion civil works Mar", amount: "4500.00" },
  { date: "2026-03-09", divisionId: tes!.id, clientId: clientF!.id, description: "Tender-Ready Professional bundle", amount: "5500.00" },
  { date: "2026-03-11", divisionId: tes!.id, clientId: clientC!.id, description: "Full tender compilation — electrical infrastructure Mar", amount: "4500.00" },
  { date: "2026-03-13", divisionId: tes!.id, clientId: clientH!.id, description: "Full tender compilation — Nkosi Group Mar bid", amount: "4500.00" },
  { date: "2026-03-16", divisionId: tes!.id, clientId: clientD!.id, description: "CIDB Grade 5 upgrade application", amount: "3200.00" },
  { date: "2026-03-18", divisionId: tes!.id, clientId: clientG!.id, description: "BoQ preparation — four bid packages", amount: "12000.00" },
  { date: "2026-03-20", divisionId: tes!.id, clientId: clientI!.id, description: "Full tender compilation — plumbing services Mar", amount: "4200.00" },
  { date: "2026-03-23", divisionId: tes!.id, clientId: clientA!.id, description: "COIDA renewal + SARS Tax Clearance assistance", amount: "1800.00" },
  { date: "2026-03-25", divisionId: tes!.id, clientId: clientB!.id, description: "Additional compliance retainer — extra hours Mar", amount: "1500.00" },
  { date: "2026-03-27", divisionId: tes!.id, clientId: clientE!.id, description: "Full tender compilation — cleaning services Mar", amount: "4200.00" },
  { date: "2026-03-28", divisionId: tes!.id, clientId: clientF!.id, description: "SBD forms + B-BBEE affidavit renewal", amount: "1300.00" },
  { date: "2026-03-30", divisionId: tes!.id, clientId: clientD!.id, description: "BoQ preparation — additional bid package", amount: "3000.00" },

  // AWS
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientB!.id, description: "Pro package — Mar", amount: "7500.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientA!.id, description: "Starter maintenance — Mar", amount: "450.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientD!.id, description: "Growth package — Mar", amount: "3500.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientF!.id, description: "Starter package — Mar", amount: "1500.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientG!.id, description: "Starter maintenance — Mar", amount: "750.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientE!.id, description: "E-commerce maintenance — Mar", amount: "1200.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientH!.id, description: "Growth package — Mar", amount: "3500.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientI!.id, description: "Starter maintenance — Mar", amount: "750.00" },
  { date: "2026-03-02", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Mar", amount: "3500.00" },
  { date: "2026-03-06", divisionId: aws!.id, clientId: clientC!.id, description: "Custom web app — VDM Electrical phase 7 (final)", amount: "28000.00" },
  { date: "2026-03-13", divisionId: aws!.id, clientId: clientF!.id, description: "E-commerce store rebuild — Mthembu Property 2026", amount: "18000.00" },
  { date: "2026-03-18", divisionId: aws!.id, clientId: clientD!.id, description: "Google Ads + SEO management — Mar", amount: "3500.00" },
  { date: "2026-03-23", divisionId: aws!.id, clientId: clientH!.id, description: "Custom AI-powered dashboard — Nkosi Group", amount: "22000.00" },
  { date: "2026-03-28", divisionId: aws!.id, clientId: clientI!.id, description: "Full website rebuild — Ferreira Plumbing 2026", amount: "3350.00" },

]);
} // end income guard

console.log("  ✓ income");

// ── Expenses (Apr 2025 – Mar 2026) ────────────────────────────────────────────
// Guard: only insert if no expense rows exist yet (expenses has no natural unique key).
const existingExpensesCount = await db.select().from(expenses).limit(1);
if (existingExpensesCount.length === 0) {
await db.insert(expenses).values([

  // APRIL 2025
  { date: "2025-04-01", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                          amount: "350.00" },
  { date: "2025-04-01", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Apr",                      amount: "890.00" },
  { date: "2025-04-02", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Apr client campaigns",                  amount: "3200.00" },
  { date: "2025-04-02", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Apr lead generation",                 amount: "2500.00" },
  { date: "2025-04-05", divisionId: tes!.id, category: "Transport",             description: "Client visits — Centurion, Midrand, Pretoria",     amount: "950.00" },
  { date: "2025-04-08", divisionId: tes!.id, category: "Printing",              description: "Tender document printing & binding — 4 bids",      amount: "680.00" },
  { date: "2025-04-10", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees",                           amount: "350.00" },
  { date: "2025-04-15", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro licences",                    amount: "780.00" },
  { date: "2025-04-20", divisionId: aws!.id, category: "Freelancers",           description: "Freelance designer — Nkosi Group website support", amount: "2500.00" },
  { date: "2025-04-25", divisionId: pmg!.id, category: "Equipment",             description: "Camera lens upgrade — content production",         amount: "3500.00" },

  // MAY 2025
  { date: "2025-05-01", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-05-01", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — May",                       amount: "890.00" },
  { date: "2025-05-02", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — May campaigns",                         amount: "3500.00" },
  { date: "2025-05-02", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — May lead generation",                 amount: "2800.00" },
  { date: "2025-05-06", divisionId: tes!.id, category: "Transport",             description: "Client visits — Mpumalanga & Pretoria",            amount: "1200.00" },
  { date: "2025-05-09", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 5 bid submissions",              amount: "850.00" },
  { date: "2025-05-12", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees",                           amount: "400.00" },
  { date: "2025-05-15", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro + GitHub Pro",                amount: "1200.00" },
  { date: "2025-05-20", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — Nkosi Group e-commerce",     amount: "3500.00" },
  { date: "2025-05-25", divisionId: pmg!.id, category: "General",               description: "Team training — social media strategy workshop",   amount: "2000.00" },

  // JUNE 2025
  { date: "2025-06-02", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-06-02", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Jun",                       amount: "890.00" },
  { date: "2025-06-03", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Jun campaigns (reduced)",               amount: "2500.00" },
  { date: "2025-06-03", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Jun lead generation",                 amount: "2000.00" },
  { date: "2025-06-06", divisionId: tes!.id, category: "Transport",             description: "Client visits — North West & Pretoria",            amount: "1000.00" },
  { date: "2025-06-10", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 3 bid submissions",              amount: "580.00" },
  { date: "2025-06-13", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees",                           amount: "350.00" },
  { date: "2025-06-16", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro licences",                    amount: "780.00" },
  { date: "2025-06-20", divisionId: aws!.id, category: "Freelancers",           description: "Freelance copywriter — website content",           amount: "1800.00" },
  { date: "2025-06-25", divisionId: aws!.id, category: "Software",              description: "Domain registrations — new client sites",          amount: "650.00" },

  // JULY 2025
  { date: "2025-07-01", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-07-01", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Jul",                       amount: "890.00" },
  { date: "2025-07-02", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Jul campaigns",                         amount: "3800.00" },
  { date: "2025-07-02", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Jul lead generation",                 amount: "3000.00" },
  { date: "2025-07-05", divisionId: tes!.id, category: "Transport",             description: "Client visits — Limpopo & Pretoria",               amount: "2200.00" },
  { date: "2025-07-08", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 5 bid submissions",              amount: "850.00" },
  { date: "2025-07-11", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CIDB portal fees",                          amount: "500.00" },
  { date: "2025-07-14", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro + GitHub Pro",                amount: "1200.00" },
  { date: "2025-07-18", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — VDM Electrical phase 2",     amount: "4500.00" },
  { date: "2025-07-22", divisionId: pmg!.id, category: "Equipment",             description: "Video production equipment — gimbal & lighting",   amount: "4500.00" },
  { date: "2025-07-28", divisionId: aws!.id, category: "Freelancers",           description: "Freelance photographer — client content shoots",   amount: "2500.00" },

  // AUGUST 2025
  { date: "2025-08-01", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-08-01", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Aug",                       amount: "890.00" },
  { date: "2025-08-04", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Women's Month campaign",                amount: "4500.00" },
  { date: "2025-08-04", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Aug lead generation",                 amount: "3500.00" },
  { date: "2025-08-07", divisionId: tes!.id, category: "Transport",             description: "Client visits — Eastern Cape & Pretoria",          amount: "2800.00" },
  { date: "2025-08-11", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 6 bid submissions",              amount: "1050.00" },
  { date: "2025-08-14", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees",                           amount: "500.00" },
  { date: "2025-08-18", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro licences",                    amount: "780.00" },
  { date: "2025-08-22", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — Mthembu booking system",     amount: "5000.00" },
  { date: "2025-08-26", divisionId: pmg!.id, category: "General",               description: "Team building event — Aug",                        amount: "2500.00" },

  // SEPTEMBER 2025
  { date: "2025-09-01", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-09-01", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Sep",                       amount: "890.00" },
  { date: "2025-09-02", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Heritage Month campaign",               amount: "4000.00" },
  { date: "2025-09-02", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Sep lead generation",                 amount: "3200.00" },
  { date: "2025-09-05", divisionId: tes!.id, category: "Transport",             description: "Client visits — Free State & Pretoria",            amount: "1800.00" },
  { date: "2025-09-09", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 5 bid submissions",              amount: "900.00" },
  { date: "2025-09-12", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CIDB portal fees",                          amount: "550.00" },
  { date: "2025-09-15", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro + GitHub Pro",                amount: "1200.00" },
  { date: "2025-09-19", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — VDM Electrical phase 3",     amount: "5000.00" },
  { date: "2025-09-23", divisionId: aws!.id, category: "Freelancers",           description: "Freelance photographer — Sep content shoots",      amount: "2500.00" },
  { date: "2025-09-29", divisionId: pmg!.id, category: "Equipment",             description: "Studio lighting upgrade",                          amount: "3500.00" },

  // OCTOBER 2025
  { date: "2025-10-01", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-10-01", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Oct",                       amount: "890.00" },
  { date: "2025-10-02", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Q4 campaign push",                      amount: "5000.00" },
  { date: "2025-10-02", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Oct lead generation",                 amount: "4000.00" },
  { date: "2025-10-06", divisionId: tes!.id, category: "Transport",             description: "Client visits — Gauteng & Centurion",              amount: "1200.00" },
  { date: "2025-10-09", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 6 bid submissions",              amount: "1050.00" },
  { date: "2025-10-13", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees",                           amount: "500.00" },
  { date: "2025-10-16", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro licences",                    amount: "780.00" },
  { date: "2025-10-20", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — Mthembu property platform",  amount: "5500.00" },
  { date: "2025-10-24", divisionId: aws!.id, category: "Freelancers",           description: "Freelance designer — Nkosi Group e-commerce v2",   amount: "3000.00" },
  { date: "2025-10-28", divisionId: pmg!.id, category: "General",               description: "Team training — video production masterclass",     amount: "3000.00" },

  // NOVEMBER 2025
  { date: "2025-11-03", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-11-03", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Nov",                       amount: "890.00" },
  { date: "2025-11-04", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Black Friday campaign",                  amount: "6000.00" },
  { date: "2025-11-04", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Nov lead generation",                 amount: "4500.00" },
  { date: "2025-11-07", divisionId: tes!.id, category: "Transport",             description: "Client visits — Western Cape & Pretoria",          amount: "3200.00" },
  { date: "2025-11-10", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 7 bid submissions",              amount: "1200.00" },
  { date: "2025-11-13", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CIDB portal fees",                          amount: "600.00" },
  { date: "2025-11-17", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro + GitHub Pro",                amount: "1200.00" },
  { date: "2025-11-21", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — Nkosi Group CRM integration", amount: "6000.00" },
  { date: "2025-11-25", divisionId: aws!.id, category: "Freelancers",           description: "Freelance photographer — Nov content shoots",      amount: "2500.00" },
  { date: "2025-11-28", divisionId: pmg!.id, category: "Equipment",             description: "New MacBook Pro — design workstation",             amount: "28000.00" },

  // DECEMBER 2025
  { date: "2025-12-01", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2025-12-01", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Dec",                       amount: "890.00" },
  { date: "2025-12-02", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Festive season campaign",               amount: "4000.00" },
  { date: "2025-12-05", divisionId: tes!.id, category: "Transport",             description: "Year-end client visits & document drops",          amount: "600.00" },
  { date: "2025-12-08", divisionId: tes!.id, category: "Printing",              description: "Tender printing — year-end bids",                  amount: "480.00" },
  { date: "2025-12-10", divisionId: aws!.id, category: "Software",              description: "Annual domain renewals — all client sites",        amount: "1800.00" },
  { date: "2025-12-15", divisionId: pmg!.id, category: "General",               description: "Year-end team appreciation dinner",                amount: "4500.00" },
  { date: "2025-12-19", divisionId: tes!.id, category: "Professional Services", description: "CIPC fees — December filings",                     amount: "300.00" },
  { date: "2025-12-22", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro licences",                    amount: "780.00" },

  // JANUARY 2026
  { date: "2026-01-05", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2026-01-05", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Jan",                       amount: "890.00" },
  { date: "2026-01-06", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Jan new year push",                     amount: "5000.00" },
  { date: "2026-01-06", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Jan brand awareness",                 amount: "4000.00" },
  { date: "2026-01-08", divisionId: tes!.id, category: "Transport",             description: "Client visits — Jan tender season kick-off",       amount: "1500.00" },
  { date: "2026-01-12", divisionId: tes!.id, category: "Printing",              description: "Tender printing — Q1 bid submissions",             amount: "850.00" },
  { date: "2026-01-14", divisionId: tes!.id, category: "Professional Services", description: "CIDB professional membership renewal",             amount: "2000.00" },
  { date: "2026-01-16", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro + GitHub Pro",                amount: "1200.00" },
  { date: "2026-01-20", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — VDM Electrical phase 5",     amount: "6000.00" },
  { date: "2026-01-24", divisionId: aws!.id, category: "Freelancers",           description: "Freelance designer — Mthembu e-commerce rebuild",  amount: "4000.00" },
  { date: "2026-01-28", divisionId: tes!.id, category: "Professional Services", description: "CIPC portal & CSD submission fees",                amount: "450.00" },

  // FEBRUARY 2026
  { date: "2026-02-02", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2026-02-02", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Feb",                       amount: "890.00" },
  { date: "2026-02-03", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Feb campaigns",                         amount: "4500.00" },
  { date: "2026-02-03", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Feb lead generation",                 amount: "3500.00" },
  { date: "2026-02-06", divisionId: tes!.id, category: "Transport",             description: "Client visits — KZN & Pretoria",                   amount: "2500.00" },
  { date: "2026-02-09", divisionId: tes!.id, category: "Printing",              description: "Tender printing — Feb bid submissions",            amount: "900.00" },
  { date: "2026-02-12", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CSD portal fees",                           amount: "550.00" },
  { date: "2026-02-16", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro licences",                    amount: "780.00" },
  { date: "2026-02-20", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — VDM Electrical phase 6",     amount: "7000.00" },
  { date: "2026-02-24", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — Nkosi Group analytics",      amount: "5000.00" },
  { date: "2026-02-27", divisionId: pmg!.id, category: "Equipment",             description: "4K camera upgrade — video production",             amount: "8500.00" },

  // MARCH 2026
  { date: "2026-03-02", divisionId: pmg!.id, category: "Software",              description: "Canva Pro subscription",                           amount: "350.00" },
  { date: "2026-03-02", divisionId: aws!.id, category: "Hosting",               description: "Vercel Pro + Neon DB — Mar",                       amount: "890.00" },
  { date: "2026-03-03", divisionId: pmg!.id, category: "Advertising",           description: "Meta Ads — Q1 2026 campaign push",                 amount: "6000.00" },
  { date: "2026-03-03", divisionId: pmg!.id, category: "Advertising",           description: "Google Ads — Mar lead generation",                 amount: "5000.00" },
  { date: "2026-03-06", divisionId: tes!.id, category: "Transport",             description: "Client site visit — Limpopo (Steyn Civil bid)",    amount: "2500.00" },
  { date: "2026-03-09", divisionId: tes!.id, category: "Printing",              description: "Tender printing — 7 large bid submissions",        amount: "1200.00" },
  { date: "2026-03-12", divisionId: pmg!.id, category: "Equipment",             description: "Studio equipment upgrade — lighting rig",          amount: "3500.00" },
  { date: "2026-03-13", divisionId: aws!.id, category: "Software",              description: "Adobe CC + Figma Pro + GitHub Pro",                amount: "1200.00" },
  { date: "2026-03-16", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — VDM Electrical final phase",  amount: "8000.00" },
  { date: "2026-03-20", divisionId: tes!.id, category: "Professional Services", description: "CIPC & CIDB portal fees — March batch",            amount: "700.00" },
  { date: "2026-03-23", divisionId: aws!.id, category: "Freelancers",           description: "Freelance developer — Nkosi Group AI dashboard",   amount: "8000.00" },
  { date: "2026-03-27", divisionId: aws!.id, category: "Freelancers",           description: "Freelance photographer — Mar content shoots",      amount: "2500.00" },

]);
} // end expenses guard

console.log("  ✓ expenses");

// ── Leads ─────────────────────────────────────────────────────────────────────
// Use onConflictDoNothing() — leads have unique email and phone constraints.
await db.insert(leads).values([
  // New
  {
    name: "Thabo Mokoena", email: "thabo@mokoenabuilds.co.za", phone: "0731112233",
    message: "Hi, I need help putting together a tender for a government roads project in Limpopo. Can you assist?",
    source: "WhatsApp", serviceInterest: "Tender document compilation", status: "new", divisionId: tes!.id,
  },
  {
    name: "Nomsa Khumalo", phone: "0799990011",
    message: "Looking for someone to manage our Facebook and Instagram pages. We are a cleaning company in Pretoria.",
    source: "WhatsApp", serviceInterest: "Social media management", status: "new", divisionId: pmg!.id,
  },
  {
    name: "Kagiso Sithole", email: "kagiso.sithole@outlook.com", phone: "0835552211",
    message: "We need to get our CSD profile updated and a B-BBEE affidavit done urgently for a bid closing next week.",
    source: "Google", serviceInterest: "CSD registration + B-BBEE affidavit", status: "new", divisionId: tes!.id,
  },
  {
    name: "Mbali Dlamini", email: "mbali@dlaminiservices.co.za", phone: "0826663344",
    message: "We are a small logistics company and need a professional website. Budget is flexible.",
    source: "Referral", serviceInterest: "Business website build", status: "new", divisionId: aws!.id,
  },
  {
    name: "Andile Khumalo", email: "andile@khumalocontracting.co.za", phone: "0712223344",
    message: "Interested in your full tender compilation service. We have a civil works bid due end of month.",
    source: "Instagram", serviceInterest: "Full tender compilation", status: "new", divisionId: tes!.id,
  },
  {
    name: "Yolanda Pretorius", email: "yolanda@pretoriushr.co.za", phone: "0823334455",
    message: "We are rebranding our HR consultancy and need a full brand identity package including logo and company profile.",
    source: "LinkedIn", serviceInterest: "Brand identity & company profile", status: "new", divisionId: pmg!.id,
  },
  // Contacted
  {
    name: "Fatima Essop", email: "fatima.essop@gmail.com", phone: "0844445566",
    message: "Need CSD registration done. Referred by a friend who used your services.",
    source: "Referral", serviceInterest: "CSD registration", status: "contacted", divisionId: tes!.id,
    notes: "Called on 2026-03-10. Sent quote. Waiting for CIPC documents from client.",
  },
  {
    name: "Wayne Olivier", email: "wayne.olivier@wayneco.co.za", phone: "0729988776",
    message: "Looking for a reliable agency to handle our LinkedIn and Instagram presence on a monthly basis.",
    source: "LinkedIn", serviceInterest: "Monthly social media retainer", status: "contacted", divisionId: pmg!.id,
    notes: "Had intro call 2026-03-12. Sending proposal this week.",
  },
  {
    name: "Tebogo Nkosi", email: "tebogo@nkosigroup.co.za", phone: "0813344557",
    message: "We need a new website and want to explore the Growth package. Our current site is outdated.",
    source: "Google", serviceInterest: "Website + Growth package", status: "contacted", divisionId: aws!.id,
    notes: "Demo call done 2026-03-14. Client reviewing proposal.",
  },
  {
    name: "Chantelle Ferreira", email: "chantelle.f@ferreiraplumbing.co.za", phone: "0844556678",
    message: "We want to start bidding on government tenders. Not sure where to begin — please advise.",
    source: "WhatsApp", serviceInterest: "Tender-Ready Starter bundle", status: "contacted", divisionId: tes!.id,
    notes: "Explained the Starter bundle. Client wants to proceed but needs to confirm budget.",
  },
  {
    name: "Bongani Mthethwa", email: "bongani@mthethwalogistics.co.za", phone: "0761234567",
    message: "Interested in a professional website for our logistics company. Seen your work on a colleague's site.",
    source: "Google", serviceInterest: "Pro website package", status: "contacted", divisionId: aws!.id,
    notes: "Sent Pro package details. Follow up scheduled for 2026-04-02.",
  },
  // Converted
  {
    name: "Ruan Botha", email: "ruan@bothatech.co.za", phone: "0617778899",
    message: "Need a website and ongoing digital marketing. Found you on Google.",
    source: "Google", serviceInterest: "Website + Growth package", status: "converted", divisionId: aws!.id,
    notes: "Signed up for Growth package. Website launched 2026-02-15. Happy client.",
  },
  {
    name: "Lindiwe Mthembu", email: "lindiwe@mthembucontracting.co.za", phone: "0838899001",
    message: "We need full tender compliance support. We have been losing bids due to missing documents.",
    source: "Referral", serviceInterest: "Tender-Ready Professional bundle", status: "converted", divisionId: tes!.id,
    notes: "Onboarded Jan 2026. First bid submitted successfully.",
  },
  {
    name: "Pieter van Wyk", email: "pieter@vanwykplastering.co.za", phone: "0827766554",
    message: "Need CIDB grading upgrade and full tender compliance package. Urgent.",
    source: "WhatsApp", serviceInterest: "CIDB grading + full tender compliance", status: "converted", divisionId: tes!.id,
    notes: "CIDB Grade 3 upgrade completed. Now on monthly compliance retainer.",
  },
  {
    name: "Siyanda Cele", email: "siyanda.cele@gmail.com", phone: "0749900112",
    message: "Starting a new events company and need a full brand identity — logo, colours, everything.",
    source: "Instagram", serviceInterest: "Brand identity & company profile", status: "converted", divisionId: pmg!.id,
    notes: "Brand identity delivered Feb 2026. Client very satisfied.",
  },
  {
    name: "Nompumelelo Dube", email: "nompumelelo@dubecatering.co.za", phone: "0831122334",
    message: "We need social media management and a website for our catering business.",
    source: "Referral", serviceInterest: "Social media management + website", status: "converted", divisionId: pmg!.id,
    notes: "Website live. On monthly social media retainer since Jan 2026.",
  },
  {
    name: "Gerhard Swart", email: "gerhard@swartcivil.co.za", phone: "0762233445",
    message: "Civil engineering company looking for tender compilation support for multiple upcoming bids.",
    source: "Google", serviceInterest: "Full tender compilation", status: "converted", divisionId: tes!.id,
    notes: "Ongoing client. 3 bids submitted, 1 awarded.",
  },
  // Lost
  {
    name: "Derek Pietersen", email: "derek.p@outlook.com", phone: "0823334456",
    message: "Need a logo for my new startup. Looking for something modern and affordable.",
    source: "Instagram", serviceInterest: "Logo & brand identity", status: "lost", divisionId: aws!.id,
    notes: "Price was too high for client's budget. Went with a freelancer.",
  },
  {
    name: "Mpho Ramahlele", email: "mpho.r@mphoservices.co.za", phone: "0765544332",
    message: "Interested in tender compilation for a cleaning services bid.",
    source: "Facebook", serviceInterest: "Full tender compilation", status: "lost", divisionId: tes!.id,
    notes: "Did not respond after initial quote was sent.",
  },
  {
    name: "Sandra Jacobs", email: "sandra.jacobs@sjenterprises.co.za", phone: "0834433221",
    message: "We need a basic website for our small business. Nothing too fancy.",
    source: "Google", serviceInterest: "Website build", status: "lost", divisionId: aws!.id,
    notes: "Client chose a cheaper DIY option.",
  },
  {
    name: "Kobus Venter", email: "kobus@ventersupplies.co.za", phone: "0815566778",
    message: "Looking for social media management for our hardware supply business.",
    source: "Facebook", serviceInterest: "Social media management", status: "lost", divisionId: pmg!.id,
    notes: "No response after two follow-up calls.",
  },
]).onConflictDoNothing();

console.log("  ✓ leads");

// ── Withdrawals ───────────────────────────────────────────────────────────────
// A handful of salary withdrawals across the last few months to give the
// salary card and withdrawal tracking meaningful data.
// Guard: only insert if no withdrawal rows exist yet (withdrawals has no natural unique key).
const existingWithdrawalsCount = await db.select().from(withdrawals).limit(1);
if (existingWithdrawalsCount.length === 0) {
await db.insert(withdrawals).values([
  { date: "2025-11-28", amount: "25000.00", description: "Salary withdrawal — November 2025" },
  { date: "2025-12-22", amount: "18000.00", description: "Salary withdrawal — December 2025" },
  { date: "2026-01-30", amount: "28000.00", description: "Salary withdrawal — January 2026" },
  { date: "2026-02-27", amount: "30000.00", description: "Salary withdrawal — February 2026" },
  { date: "2026-03-28", amount: "35000.00", description: "Salary withdrawal — March 2026" },
]);
} // end withdrawals guard

console.log("  ✓ withdrawals");

// ── Snapshots (past closed months) ───────────────────────────────────────────
// Generate past months from 2025-04 up to (but not including) current month.
const startYear = 2025, startMonth = 4; // April 2025
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1; // 1-indexed

const pastMonths: string[] = [];
let y = startYear, m = startMonth;
while (y < currentYear || (y === currentYear && m < currentMonth)) {
  pastMonths.push(`${y}-${String(m).padStart(2, "0")}`);
  m++;
  if (m > 12) { m = 1; y++; }
}

const summaries = await Promise.all(
  pastMonths.map((period) =>
    getFinancialSummaryForPeriod(
      `DATE_TRUNC('month', TIMESTAMP '${period}-01')`,
      `DATE_TRUNC('month', TIMESTAMP '${period}-01') + INTERVAL '1 month'`
    )
  )
);

const snapshotValues = pastMonths.map((period, i) => ({
  period,
  revenue:    String(summaries[i]!.revenue),
  expenses:   String(summaries[i]!.expenses),
  pmgShare:   String(summaries[i]!.pmgShare),
  profitPool: String(summaries[i]!.profitPool),
  salary:     String(summaries[i]!.salary),
  reinvest:   String(summaries[i]!.reinvest),
  reserve:    String(summaries[i]!.reserve),
  flex:       String(summaries[i]!.flex),
}));

await db.insert(snapshots).values(snapshotValues).onConflictDoNothing();
const lastMonth = pastMonths[pastMonths.length - 1];
console.log(`  ✓ snapshots (${pastMonths.length} months: 2025-04 → ${lastMonth})`);

// ── Seed expenses (idempotent) ────────────────────────────────────────────────
// Hardcoded UUIDs so onConflictDoNothing() can detect duplicates on the PK.
// Covers ≥ 3 divisions (PMG, TES, AWS) and ≥ 3 categories (Salaries, Software,
// Marketing, Office, Travel) — Requirements 6.1, 6.5.
await db.insert(expenses).values([
  // PMG — Salaries
  { id: "a1000000-0000-0000-0000-000000000001", date: "2025-01-31", divisionId: pmg!.id, category: "Salaries",  description: "PMG staff salaries — Jan 2025",          amount: "45000.00" },
  // PMG — Marketing
  { id: "a1000000-0000-0000-0000-000000000002", date: "2025-01-15", divisionId: pmg!.id, category: "Marketing", description: "PMG social media ad spend — Jan 2025",    amount: "8500.00"  },
  // PMG — Office
  { id: "a1000000-0000-0000-0000-000000000003", date: "2025-01-10", divisionId: pmg!.id, category: "Office",    description: "PMG office supplies & stationery",         amount: "1200.00"  },
  // TES — Salaries
  { id: "a1000000-0000-0000-0000-000000000004", date: "2025-01-31", divisionId: tes!.id, category: "Salaries",  description: "TES staff salaries — Jan 2025",          amount: "38000.00" },
  // TES — Travel
  { id: "a1000000-0000-0000-0000-000000000005", date: "2025-01-20", divisionId: tes!.id, category: "Travel",    description: "TES client site visits — Jan 2025",       amount: "3200.00"  },
  // TES — Office
  { id: "a1000000-0000-0000-0000-000000000006", date: "2025-01-12", divisionId: tes!.id, category: "Office",    description: "TES office rent & utilities — Jan 2025",  amount: "6500.00"  },
  // AWS — Salaries
  { id: "a1000000-0000-0000-0000-000000000007", date: "2025-01-31", divisionId: aws!.id, category: "Salaries",  description: "AWS staff salaries — Jan 2025",          amount: "42000.00" },
  // AWS — Software
  { id: "a1000000-0000-0000-0000-000000000008", date: "2025-01-05", divisionId: aws!.id, category: "Software",  description: "AWS SaaS licences — Jan 2025",            amount: "2800.00"  },
  // AWS — Travel
  { id: "a1000000-0000-0000-0000-000000000009", date: "2025-01-18", divisionId: aws!.id, category: "Travel",    description: "AWS client meetings — Jan 2025",          amount: "1500.00"  },
]).onConflictDoNothing();

console.log("  ✓ seed expenses (idempotent)");

// ── Seed leads (idempotent) ───────────────────────────────────────────────────
// One row per status so all four statuses are guaranteed present.
// Hardcoded UUIDs + onConflictDoNothing() — Requirements 6.2, 6.5.
// Using phone-only (no email) to avoid conflicts with the existing leads that
// have unique email constraints.
await db.insert(leads).values([
  {
    id: "b2000000-0000-0000-0000-000000000001",
    name: "Seed Lead — New", phone: "0600000001",
    message: "Seed record — new status.", source: "Seed",
    serviceInterest: "General enquiry", status: "new", divisionId: pmg!.id,
  },
  {
    id: "b2000000-0000-0000-0000-000000000002",
    name: "Seed Lead — Contacted", phone: "0600000002",
    message: "Seed record — contacted status.", source: "Seed",
    serviceInterest: "General enquiry", status: "contacted", divisionId: tes!.id,
    notes: "Initial contact made.",
  },
  {
    id: "b2000000-0000-0000-0000-000000000003",
    name: "Seed Lead — Converted", phone: "0600000003",
    message: "Seed record — converted status.", source: "Seed",
    serviceInterest: "General enquiry", status: "converted", divisionId: aws!.id,
    notes: "Client onboarded.",
  },
  {
    id: "b2000000-0000-0000-0000-000000000004",
    name: "Seed Lead — Lost", phone: "0600000004",
    message: "Seed record — lost status.", source: "Seed",
    serviceInterest: "General enquiry", status: "lost", divisionId: pmg!.id,
    notes: "No response after follow-up.",
  },
]).onConflictDoNothing();

console.log("  ✓ seed leads (idempotent)");

// ── Seed snapshot (idempotent) ────────────────────────────────────────────────
// One closed prior-month snapshot with valid PeriodSummary numeric fields.
// period "2025-01" is safely in the past and not generated by the dynamic loop
// above (which starts at 2025-04). — Requirements 6.3, 6.5.
await db.insert(snapshots).values([
  {
    period:     "2025-01",
    revenue:    "185000.00",
    expenses:   "62000.00",
    pmgShare:   "30660.00",
    profitPool: "92340.00",
    salary:     "27702.00",
    reinvest:   "18468.00",
    reserve:    "9234.00",
    flex:       "36936.00",
  },
]).onConflictDoNothing();

console.log("  ✓ seed snapshot (idempotent)");

console.log(`
✅ Seed complete.

   Divisions  : 3
   Clients    : 9
   Pricing    : 5 packages
   Income     : ~200 entries across 12 months (Apr 2025 – Mar 2026)
   Expenses   : ~130 entries across 12 months
   Leads      : 21  (6 new · 5 contacted · 6 converted · 4 lost)
   Withdrawals: 5   (Nov 2025 – Mar 2026)

   Monthly revenue (approx):
     Apr 2025 → R128,000
     May 2025 → R142,500
     Jun 2025 → R118,000
     Jul 2025 → R155,000
     Aug 2025 → R168,500
     Sep 2025 → R175,000
     Oct 2025 → R192,000
     Nov 2025 → R210,000
     Dec 2025 → R145,000
     Jan 2026 → R220,000
     Feb 2026 → R235,000
     Mar 2026 → R258,000
                ─────────
     12-month total → ~R2,147,000
`);

await client.end();
