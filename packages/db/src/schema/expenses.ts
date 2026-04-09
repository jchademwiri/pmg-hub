import { index, pgTable, text, timestamp, uuid, numeric, date, check } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { divisions } from "./divisions";
import { clients } from "./clients";

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }), // restrict: prevent division deletion while financial records exist
    category: text("category").notNull(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "set null" }), // Optional link to a client
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // updatedAt is managed by the application layer on update. Any database-level operation
    // that bypasses the application (direct SQL fixes, migrations, external services) will
    // leave updatedAt stale. Teams requiring guaranteed accuracy should implement a
    // PostgreSQL trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} > 0`),
    index("expenses_date_idx").on(t.date),
    index("expenses_division_id_idx").on(t.divisionId),
    index("expenses_category_idx").on(t.category),
    index("expenses_client_id_idx").on(t.clientId),
  ],
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export const expensesRelations = relations(expenses, ({ one }) => ({
  division: one(divisions, {
    fields: [expenses.divisionId],
    references: [divisions.id],
  }),
  client: one(clients, {
    fields: [expenses.clientId],
    references: [clients.id],
  }),
}));
