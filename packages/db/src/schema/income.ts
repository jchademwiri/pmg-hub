import { check, date, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { divisions } from "./divisions";
import { clients } from "./clients";

export const income = pgTable(
  "income",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }), // restrict: prevent division deletion while financial records exist
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
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
    check("income_amount_positive", sql`${t.amount} > 0`),
    index("income_date_idx").on(t.date),
    index("income_division_id_idx").on(t.divisionId),
    index("income_client_id_idx").on(t.clientId),
  ],
);

export type Income = typeof income.$inferSelect;
export type NewIncome = typeof income.$inferInsert;

export const incomeRelations = relations(income, ({ one }) => ({
  division: one(divisions, {
    fields: [income.divisionId],
    references: [divisions.id],
  }),
  client: one(clients, {
    fields: [income.clientId],
    references: [clients.id],
  }),
}));
