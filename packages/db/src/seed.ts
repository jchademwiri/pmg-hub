import { db } from "./client";
import { awsPricing } from "./schema";

const seedRows = [
  {
    name: "Starter",
    price: 29900,
    period: "/month",
    upfront: null,
    type: "monthly" as const,
    popular: false,
    description: "Entry-level monthly package",
    cta: "Get Started",
    features: [] as string[],
    sortOrder: 1,
  },
  {
    name: "Growth",
    price: 59900,
    period: "/month",
    upfront: 150000,
    type: "monthly" as const,
    popular: true,
    description: "Growth monthly package",
    cta: "Get Started",
    features: [] as string[],
    sortOrder: 2,
  },
  {
    name: "Pro",
    price: 99900,
    period: "/month",
    upfront: 250000,
    type: "monthly" as const,
    popular: false,
    description: "Pro monthly package",
    cta: "Get Started",
    features: [] as string[],
    sortOrder: 3,
  },
  {
    name: "Landing Page",
    price: 250000,
    period: null,
    upfront: null,
    type: "once_off" as const,
    popular: false,
    description: "Single landing page",
    cta: "Get Started",
    features: [] as string[],
    sortOrder: 4,
  },
  {
    name: "Business Website",
    price: 650000,
    period: null,
    upfront: null,
    type: "once_off" as const,
    popular: false,
    description: "Full business website",
    cta: "Get Started",
    features: [] as string[],
    sortOrder: 5,
  },
];

async function seed() {
  console.log("Seeding aws_pricing...");

  const result = await db
    .insert(awsPricing)
    .values(seedRows)
    .onConflictDoNothing({ target: awsPricing.name });

  console.log("Seed complete. Rows inserted (skipped if already present).");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
