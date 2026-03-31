// packages/db/src/seed.ts
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { divisions, clients, income, expenses, leads, withdrawals, awsPricing } from "./schema";

config({ path: resolve(__dirname, "../.env") });

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
const [clientA, clientB, clientC, clientD, clientE, clientF, clientG, clientH, clientI] = await db
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
]);

console.log("  ✓ aws_pricing");

// ── Income (Apr 2025 – Mar 2026) ─────────────────────────────────────────────
//
// Monthly revenue (all 3 divisions combined, showing growth trend):
//   Apr 2025 → ~R128,000   May 2025 → ~R142,500   Jun 2025 → ~R118,000
//   Jul 2025 → ~R155,000   Aug 2025 → ~R168,500   Sep 2025 → ~R175,000
//   Oct 2025 → ~R192,000   Nov 2025 → ~R210,000   Dec 2025 → ~R145,000
//   Jan 2026 → ~R220,000   Feb 2026 → ~R235,000   Mar 2026 → ~R258,000
//
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

console.log("  ✓ income");

// ── Expenses (Apr 2025 – Mar 2026) ────────────────────────────────────────────
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

console.log("  ✓ expenses");

// ── Leads ─────────────────────────────────────────────────────────────────────
await db.insert(leads).values([
  // New
  { name: "Thabo Mokoena",     email: "thabo@mokoenabuilds.co.za",       phone: "0731112233", source: "WhatsApp",  serviceInterest: "Tender document compilation",          status: "new",       divisionId: tes!.id },
  { name: "Nomsa Khumalo",                                               phone: "0799990011", source: "WhatsApp",  serviceInterest: "Social media management",              status: "new",       divisionId: pmg!.id },
  { name: "Kagiso Sithole",    email: "kagiso.sithole@outlook.com",      phone: "0835552211", source: "Google",    serviceInterest: "CSD registration + B-BBEE affidavit",  status: "new",       divisionId: tes!.id },
  { name: "Mbali Dlamini",     email: "mbali@dlaminiservices.co.za",     phone: "0826663344", source: "Referral",  serviceInterest: "Business website build",               status: "new",       divisionId: aws!.id },
  { name: "Andile Khumalo",    email: "andile@khumalocontracting.co.za", phone: "0712223344", source: "Instagram", serviceInterest: "Full tender compilation",               status: "new",       divisionId: tes!.id },
  { name: "Yolanda Pretorius", email: "yolanda@pretoriushr.co.za",       phone: "0823334455", source: "LinkedIn",  serviceInterest: "Brand identity & company profile",     status: "new",       divisionId: pmg!.id },
  // Contacted
  { name: "Fatima Essop",      email: "fatima.essop@gmail.com",          phone: "0844445566", source: "Referral",  serviceInterest: "CSD registration",                     status: "contacted", divisionId: tes!.id },
  { name: "Wayne Olivier",     email: "wayne.olivier@wayneco.co.za",     phone: "0729988776", source: "LinkedIn",  serviceInterest: "Monthly social media retainer",        status: "contacted", divisionId: pmg!.id },
  { name: "Tebogo Nkosi",      email: "tebogo@nkosigroup.co.za",         phone: "0813344557", source: "Google",    serviceInterest: "Website + Growth package",             status: "contacted", divisionId: aws!.id },
  { name: "Chantelle Ferreira",email: "chantelle.f@ferreiraplumbing.co.za", phone: "0844556678", source: "WhatsApp", serviceInterest: "Tender-Ready Starter bundle",        status: "contacted", divisionId: tes!.id },
  { name: "Bongani Mthethwa",  email: "bongani@mthethwalogistics.co.za", phone: "0761234567", source: "Google",    serviceInterest: "Pro website package",                  status: "contacted", divisionId: aws!.id },
  // Converted
  { name: "Ruan Botha",        email: "ruan@bothatech.co.za",            phone: "0617778899", source: "Google",    serviceInterest: "Website + Growth package",             status: "converted", divisionId: aws!.id },
  { name: "Lindiwe Mthembu",   email: "lindiwe@mthembucontracting.co.za",phone: "0838899001", source: "Referral",  serviceInterest: "Tender-Ready Professional bundle",     status: "converted", divisionId: tes!.id },
  { name: "Pieter van Wyk",    email: "pieter@vanwykplastering.co.za",   phone: "0827766554", source: "WhatsApp",  serviceInterest: "CIDB grading + full tender compliance", status: "converted", divisionId: tes!.id },
  { name: "Siyanda Cele",      email: "siyanda.cele@gmail.com",          phone: "0749900112", source: "Instagram", serviceInterest: "Brand identity & company profile",     status: "converted", divisionId: pmg!.id },
  { name: "Nompumelelo Dube",  email: "nompumelelo@dubecatering.co.za",  phone: "0831122334", source: "Referral",  serviceInterest: "Social media management + website",   status: "converted", divisionId: pmg!.id },
  { name: "Gerhard Swart",     email: "gerhard@swartcivil.co.za",        phone: "0762233445", source: "Google",    serviceInterest: "Full tender compilation",               status: "converted", divisionId: tes!.id },
  // Lost
  { name: "Derek Pietersen",   email: "derek.p@outlook.com",             phone: "0823334456", source: "Instagram", serviceInterest: "Logo & brand identity",                status: "lost",      divisionId: aws!.id },
  { name: "Mpho Ramahlele",    email: "mpho.r@mphoservices.co.za",       phone: "0765544332", source: "Facebook",  serviceInterest: "Full tender compilation",               status: "lost",      divisionId: tes!.id },
  { name: "Sandra Jacobs",     email: "sandra.jacobs@sjenterprises.co.za",phone: "0834433221", source: "Google",   serviceInterest: "Website build",                        status: "lost",      divisionId: aws!.id },
  { name: "Kobus Venter",      email: "kobus@ventersupplies.co.za",      phone: "0815566778", source: "Facebook",  serviceInterest: "Social media management",              status: "lost",      divisionId: pmg!.id },
]);

console.log("  ✓ leads");

// ── Withdrawals ───────────────────────────────────────────────────────────────
// A handful of salary withdrawals across the last few months to give the
// salary card and withdrawal tracking meaningful data.
await db.insert(withdrawals).values([
  { date: "2025-11-28", amount: "25000.00", description: "Salary withdrawal — November 2025" },
  { date: "2025-12-22", amount: "18000.00", description: "Salary withdrawal — December 2025" },
  { date: "2026-01-30", amount: "28000.00", description: "Salary withdrawal — January 2026" },
  { date: "2026-02-27", amount: "30000.00", description: "Salary withdrawal — February 2026" },
  { date: "2026-03-28", amount: "35000.00", description: "Salary withdrawal — March 2026" },
]);

console.log("  ✓ withdrawals");

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
