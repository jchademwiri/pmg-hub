import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { divisions } from "./divisions";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "converted",
  "lost",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
    source: text("source"),
    serviceInterest: text("service_interest"),
    status: leadStatusEnum("status").notNull().default("new"),
    // set null: leads are soft-linked; division deletion should not block or cascade
    divisionId: uuid("division_id").references(() => divisions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // updatedAt is managed by the application layer on update. Any database-level operation
    // that bypasses the application (direct SQL fixes, migrations, external services) will
    // leave updatedAt stale. Teams requiring guaranteed accuracy should implement a
    // PostgreSQL trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (t) => [
    check(
      "leads_email_or_phone",
      sql`${t.email} IS NOT NULL OR ${t.phone} IS NOT NULL`,
    ),
    index("leads_status_idx").on(t.status),
    index("leads_created_at_idx").on(t.createdAt),
    index("leads_email_idx").on(t.email),
    index("leads_division_id_idx").on(t.divisionId),
    uniqueIndex("leads_email_unique_idx")
      .on(t.email)
      .where(sql`${t.email} IS NOT NULL`),
    uniqueIndex("leads_phone_unique_idx")
      .on(t.phone)
      .where(sql`${t.phone} IS NOT NULL`),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export const leadsRelations = relations(leads, ({ one }) => ({
  division: one(divisions, {
    fields: [leads.divisionId],
    references: [divisions.id],
  }),
}));
