import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const pmgLeadServiceEnum = pgEnum("pmg_lead_service", [
  "tendering",
  "web_dev",
  "both",
  "general",
]);

export const pmgLeadStatusEnum = pgEnum("pmg_lead_status", [
  "new",
  "contacted",
  "referred_tes",
  "referred_aws",
  "converted",
  "archived",
]);

export const pmgLeads = pgTable(
  "pmg_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    serviceInterest: pmgLeadServiceEnum("service_interest")
      .notNull()
      .default("general"),
    message: text("message"),
    newsletterOptIn: boolean("newsletter_opt_in").notNull().default(false),
    status: pmgLeadStatusEnum("status").notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("pmg_leads_status_idx").on(table.status),
    index("pmg_leads_email_idx").on(table.email),
  ]
);

export type PmgLead = typeof pmgLeads.$inferSelect;
export type NewPmgLead = typeof pmgLeads.$inferInsert;
