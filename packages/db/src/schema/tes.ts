import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const tesServiceEnum = pgEnum("tes_service", [
  "bid_preparation",
  "tender_tracking",
  "compliance_docs",
  "method_statements",
  "pricing_boq",
  "post_award",
  "project_management",
  "full_service",
]);

export const tesLeadStatusEnum = pgEnum("tes_lead_status", [
  "new",
  "contacted",
  "converted",
  "archived",
]);

export const tesLeads = pgTable(
  "tes_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    company: text("company"),
    serviceInterest: tesServiceEnum("service_interest"),
    message: text("message").notNull(),
    newsletterOptIn: boolean("newsletter_opt_in").default(false),
    status: tesLeadStatusEnum("status").notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("tes_leads_status_idx").on(table.status),
    index("tes_leads_email_idx").on(table.email),
  ]
);

export type TesLead = typeof tesLeads.$inferSelect;
export type NewTesLead = typeof tesLeads.$inferInsert;
