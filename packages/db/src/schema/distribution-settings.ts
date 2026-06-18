import { pgTable, varchar, numeric, date, boolean, timestamp, uuid, index } from "drizzle-orm/pg-core";

/**
 * Stores configurable distribution rates with effective dates.
 * Historical months always use the rates that were active at that time.
 * New rates take effect from effectiveFrom onward.
 *
 * Current defaults (seeded):
 *   - pmg_share: 25% of gross revenue
 *   - salary: 35% of profit pool
 *   - reinvest: 30% of profit pool
 *   - reserve: 30% of profit pool
 *   - flex: 5% of profit pool
 */
export const distributionSettings = pgTable(
  "distribution_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /** Which rate this row controls (e.g. 'pmg_share', 'salary', 'reinvest') */
    rateKey: varchar("rate_key", { length: 50 }).notNull(),

    /** The rate value as a decimal (e.g. 0.25 for 25%) */
    rateValue: numeric("rate_value", { precision: 6, scale: 4 }).notNull(),

    /** Date from which this rate takes effect (inclusive) */
    effectiveFrom: date("effective_from", { mode: "date" }).notNull(),

    /** Optional end date; null means this rate is currently active */
    effectiveTo: date("effective_to", { mode: "date" }),

    /** Human-readable description of why this rate was set */
    description: varchar("description", { length: 255 }),

    /** Whether this is the currently active rate (soft flag for quick queries) */
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("distribution_settings_rate_key_idx").on(t.rateKey),
    index("distribution_settings_active_idx").on(t.isActive),
    index("distribution_settings_effective_idx").on(t.effectiveFrom),
  ]
);

export type DistributionSetting = typeof distributionSettings.$inferSelect;
export type NewDistributionSetting = typeof distributionSettings.$inferInsert;
