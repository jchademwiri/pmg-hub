import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { income } from "./income";
import { expenses } from "./expenses";
import { divisions } from "./divisions";
import { user } from "./auth";

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    businessName: text("business_name"),
    email: text("email"),
    phone: text("phone"),
    divisionId: uuid("division_id").references(() => divisions.id),
    isActive: boolean("is_active").notNull().default(true),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // updatedAt is managed by the application layer on update. Any database-level operation
    // that bypasses the application (direct SQL fixes, migrations, external services) will
    // leave updatedAt stale. Teams requiring guaranteed accuracy should implement a
    // PostgreSQL trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("clients_name_idx").on(t.name),
    uniqueIndex("clients_email_unique_idx").on(t.email).where(sql`${t.email} IS NOT NULL`),
    uniqueIndex("clients_user_id_unique_idx").on(t.userId).where(sql`${t.userId} IS NOT NULL`),
  ],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export const clientsRelations = relations(clients, ({ one, many }) => ({
  income: many(income),
  expenses: many(expenses),
  division: one(divisions, {
    fields: [clients.divisionId],
    references: [divisions.id],
  }),
}));

export const clientChangeRequests = pgTable("client_change_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  proposedBusinessName: text("proposed_business_name"),
  proposedVatNumber: text("proposed_vat_number"),
  proposedRegistrationNumber: text("proposed_registration_number"),
  proposedBillingEmail: text("proposed_billing_email"),
  proposedBillingAddress: text("proposed_billing_address"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const clientChangeRequestsRelations = relations(clientChangeRequests, ({ one }) => ({
  client: one(clients, {
    fields: [clientChangeRequests.clientId],
    references: [clients.id],
  }),
  reviewer: one(user, {
    fields: [clientChangeRequests.reviewedBy],
    references: [user.id],
  }),
}));
