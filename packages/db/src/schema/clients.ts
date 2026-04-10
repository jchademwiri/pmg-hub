import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { income } from "./income";
import { expenses } from "./expenses";

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    businessName: text("business_name"),
    email: text("email"),
    phone: text("phone"),
    isActive: boolean("is_active").notNull().default(true),
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
  ],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export const clientsRelations = relations(clients, ({ many }) => ({
  income: many(income),
  expenses: many(expenses),
}));
