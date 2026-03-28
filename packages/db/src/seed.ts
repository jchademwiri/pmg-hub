import { db } from "./client";
import { awsPricing, divisions, clients, income, expenses, leads } from "./schema/index";
import { eq, and } from "drizzle-orm";

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
  // Block 1: aws_pricing (unchanged)
  console.log("Seeding aws_pricing...");

  const result = await db
    .insert(awsPricing)
    .values(seedRows)
    .onConflictDoNothing({ target: awsPricing.name });

  console.log("Seed complete. Rows inserted (skipped if already present).");

  // Block 2: financial tables in transaction
  await db.transaction(async (tx) => {
    console.log("Seeding financial tables...");

    // 1. Divisions
    const divisionNames = ["TES", "AWS"];
    const divisionIds: Record<string, string> = {};

    for (const name of divisionNames) {
      const existing = await tx
        .select()
        .from(divisions)
        .where(eq(divisions.name, name));

      if (existing.length > 0) {
        divisionIds[name] = existing[0].id;
        console.log(`Division "${name}" already exists, skipping.`);
      } else {
        const inserted = await tx
          .insert(divisions)
          .values({ name })
          .returning();
        divisionIds[name] = inserted[0].id;
        console.log(`Inserted division "${name}".`);
      }
    }

    // 2. Clients
    const clientFixtures = [
      {
        name: "John Smith",
        businessName: "Smith Consulting",
        email: "john@smithconsulting.co.za",
        phone: "+27821234567",
      },
      {
        name: "Sarah Johnson",
        businessName: "Johnson Enterprises",
        email: "sarah@johnsonenterprises.co.za",
        phone: "+27831234567",
      },
      {
        name: "Mike Williams",
        businessName: null,
        email: "mike@gmail.com",
        phone: "+27841234567",
      },
    ];

    const clientIds: Record<string, string> = {};

    for (const fixture of clientFixtures) {
      const existing = await tx
        .select()
        .from(clients)
        .where(eq(clients.name, fixture.name));

      if (existing.length > 0) {
        clientIds[fixture.name] = existing[0].id;
        console.log(`Client "${fixture.name}" already exists, skipping.`);
      } else {
        const inserted = await tx.insert(clients).values(fixture).returning();
        clientIds[fixture.name] = inserted[0].id;
        console.log(`Inserted client "${fixture.name}".`);
      }
    }

    // 3. Income records
    const incomeFixtures = [
      {
        date: "2024-01-15",
        description: "Website development",
        amount: "15000.00",
        divisionName: "TES",
        clientName: "John Smith",
      },
      {
        date: "2024-02-01",
        description: "AWS setup and configuration",
        amount: "8500.00",
        divisionName: "AWS",
        clientName: "Sarah Johnson",
      },
      {
        date: "2024-02-15",
        description: "Monthly retainer",
        amount: "5000.00",
        divisionName: "TES",
        clientName: "Mike Williams",
      },
    ];

    for (const fixture of incomeFixtures) {
      const existing = await tx
        .select()
        .from(income)
        .where(
          and(
            eq(income.description, fixture.description),
            eq(income.date, fixture.date),
          ),
        );

      if (existing.length > 0) {
        console.log(
          `Income record "${fixture.description}" on ${fixture.date} already exists, skipping.`,
        );
      } else {
        await tx.insert(income).values({
          date: fixture.date,
          description: fixture.description,
          amount: fixture.amount,
          divisionId: divisionIds[fixture.divisionName],
          clientId: clientIds[fixture.clientName],
        });
        console.log(`Inserted income record "${fixture.description}".`);
      }
    }

    // 4. Expense records
    const expenseFixtures = [
      {
        date: "2024-01-20",
        category: "Software",
        description: "Adobe Creative Suite",
        amount: "2500.00",
        divisionName: "TES",
      },
      {
        date: "2024-02-05",
        category: "Infrastructure",
        description: "AWS hosting costs",
        amount: "1200.00",
        divisionName: "AWS",
      },
      {
        date: "2024-02-20",
        category: "Marketing",
        description: "Social media advertising",
        amount: "3000.00",
        divisionName: "TES",
      },
    ];

    for (const fixture of expenseFixtures) {
      const existing = await tx
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.description, fixture.description),
            eq(expenses.date, fixture.date),
          ),
        );

      if (existing.length > 0) {
        console.log(
          `Expense record "${fixture.description}" on ${fixture.date} already exists, skipping.`,
        );
      } else {
        await tx.insert(expenses).values({
          date: fixture.date,
          category: fixture.category,
          description: fixture.description,
          amount: fixture.amount,
          divisionId: divisionIds[fixture.divisionName],
        });
        console.log(`Inserted expense record "${fixture.description}".`);
      }
    }

    // 5. Lead records
    const leadFixtures = [
      {
        name: "Alice Brown",
        email: "alice@example.com",
        phone: "+27851234567",
        source: "website",
        serviceInterest: "web development",
        status: "new" as const,
        divisionName: null,
      },
      {
        name: "Bob Davis",
        email: "bob@techcorp.co.za",
        phone: "+27861234567",
        source: "referral",
        serviceInterest: "aws services",
        status: "contacted" as const,
        divisionName: "AWS",
      },
      {
        name: "Carol Wilson",
        email: "carol@startup.co.za",
        phone: "+27871234567",
        source: "social media",
        serviceInterest: "monthly package",
        status: "new" as const,
        divisionName: "TES",
      },
    ];

    for (const fixture of leadFixtures) {
      const normalizedEmail = fixture.email.toLowerCase();

      const existing = await tx
        .select()
        .from(leads)
        .where(eq(leads.email, normalizedEmail));

      if (existing.length > 0) {
        console.log(
          `Lead with email "${normalizedEmail}" already exists, skipping.`,
        );
      } else {
        await tx.insert(leads).values({
          name: fixture.name,
          email: normalizedEmail,
          phone: fixture.phone,
          source: fixture.source,
          serviceInterest: fixture.serviceInterest,
          status: fixture.status,
          divisionId:
            fixture.divisionName ? divisionIds[fixture.divisionName] : null,
        });
        console.log(`Inserted lead "${fixture.name}".`);
      }
    }

    console.log("Financial tables seeded successfully.");
  });
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
