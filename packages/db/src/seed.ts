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
    { name: "Accounting & Web Services" },
  ])
  .returning();

console.log("  ✓ divisions");

// ── Clients ──────────────────────────────────────────────────────────────────
const [clientA, clientB, clientC] = await db
  .insert(clients)
  .values([
    { name: "Sipho Dlamini", businessName: "Dlamini Construction CC", email: "sipho@dlaminicc.co.za", phone: "0821234567" },
    { name: "Priya Naidoo", businessName: "Naidoo Logistics (Pty) Ltd", email: "priya@naidoolog.co.za", phone: "0839876543" },
    { name: "Johan van der Merwe", businessName: "VDM Electrical", email: "johan@vdmelectrical.co.za", phone: "0764561234" },
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

// ── Income ────────────────────────────────────────────────────────────────────
await db.insert(income).values([
  { date: "2025-01-15", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Jan", amount: "3500.00" },
  { date: "2025-02-15", divisionId: pmg!.id, clientId: clientA!.id, description: "Social media management — Feb", amount: "3500.00" },
  { date: "2025-01-20", divisionId: tes!.id, clientId: clientB!.id, description: "CSD registration & CIDB grading", amount: "5800.00" },
  { date: "2025-02-10", divisionId: tes!.id, clientId: clientC!.id, description: "Tender document compilation", amount: "4200.00" },
  { date: "2025-01-28", divisionId: aws!.id, clientId: clientB!.id, description: "Website build — Naidoo Logistics", amount: "12000.00" },
  { date: "2025-02-28", divisionId: aws!.id, clientId: clientC!.id, description: "Growth package — Feb", amount: "3500.00" },
]);

console.log("  ✓ income");

// ── Expenses ──────────────────────────────────────────────────────────────────
await db.insert(expenses).values([
  { date: "2025-01-05", divisionId: pmg!.id, category: "Software", description: "Canva Pro subscription", amount: "350.00" },
  { date: "2025-01-05", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — client campaigns", amount: "2200.00" },
  { date: "2025-02-05", divisionId: pmg!.id, category: "Advertising", description: "Meta Ads — client campaigns", amount: "2400.00" },
  { date: "2025-01-10", divisionId: tes!.id, category: "Transport", description: "Client site visits — Centurion", amount: "650.00" },
  { date: "2025-02-12", divisionId: tes!.id, category: "Printing", description: "Tender document printing & binding", amount: "480.00" },
  { date: "2025-01-15", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB", amount: "890.00" },
  { date: "2025-02-15", divisionId: aws!.id, category: "Hosting", description: "Vercel Pro + Neon DB", amount: "890.00" },
]);

console.log("  ✓ expenses");

// ── Leads ─────────────────────────────────────────────────────────────────────
await db.insert(leads).values([
  { name: "Thabo Mokoena", email: "thabo@mokoenabuilds.co.za", phone: "0731112233", source: "WhatsApp", serviceInterest: "Tender document compilation", status: "new", divisionId: tes!.id },
  { name: "Fatima Essop", email: "fatima.essop@gmail.com", phone: "0844445566", source: "Referral", serviceInterest: "CSD registration", status: "contacted", divisionId: tes!.id },
  { name: "Ruan Botha", email: "ruan@bothatech.co.za", phone: "0617778899", source: "Google", serviceInterest: "Website + Growth package", status: "converted", divisionId: aws!.id },
  { name: "Nomsa Khumalo", phone: "0799990011", source: "WhatsApp", serviceInterest: "Social media management", status: "new", divisionId: pmg!.id },
  { name: "Derek Pietersen", email: "derek.p@outlook.com", phone: "0823334455", source: "Instagram", serviceInterest: "Logo & brand identity", status: "lost", divisionId: aws!.id },
]);

console.log("  ✓ leads");

console.log("\n✅ Seed complete.");
await client.end();
