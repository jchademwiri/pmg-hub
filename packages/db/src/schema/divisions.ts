import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { income } from "./income";
import { expenses } from "./expenses";
import { leads } from "./leads";

export const divisions = pgTable(
  "divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // updatedAt is managed by the application layer on update. Any database-level operation
    // that bypasses the application (direct SQL fixes, migrations, external services) will
    // leave updatedAt stale. Teams requiring guaranteed accuracy should implement a
    // PostgreSQL trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("divisions_name_idx").on(t.name)],
);

export type Division = typeof divisions.$inferSelect;
export type NewDivision = typeof divisions.$inferInsert;

export const divisionsRelations = relations(divisions, ({ many }) => ({
  income: many(income),
  expenses: many(expenses),
  leads: many(leads),
}));
