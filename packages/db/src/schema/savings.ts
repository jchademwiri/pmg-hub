import {
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { assets } from './assets';

// ── Savings goals ─────────────────────────────────────────────────────────────
// Save up for something the business wants to buy, bit by bit. Deliberately
// standalone: `assets` requires acquisition_date and cost NOT NULL because it
// registers things already owned, which cannot model a thing you are still
// saving for. When the goal is met, `convertGoalToAsset` creates the asset row
// and back-links it via `asset_id` - that is the migration path into the assets
// register, and it is also why this module can be dropped without touching
// anything else.

export const savingsGoalStatusEnum = pgEnum('savings_goal_status', [
  'saving',
  'purchased',
  'cancelled',
]);

export const savingsContributionTypeEnum = pgEnum('savings_contribution_type', [
  'deposit',
  'withdrawal',
]);

export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),

    // The amount being saved toward - typically the price rounded up to a
    // comfortable figure (R4,295 -> R4,500). Kept separate from actual_price so
    // the page can show both "what it costs" and "what I'm putting away".
    targetAmount: numeric('target_amount', { precision: 14, scale: 2 }).notNull(),
    actualPrice: numeric('actual_price', { precision: 14, scale: 2 }),

    vendor: text('vendor'),
    productUrl: text('product_url'),

    // Optional key into SPEND_TRACKERS (apps/admin/src/lib/spend-trackers.ts).
    // When set, the goal shows what the purchase would replace and how long it
    // takes to pay for itself. Free text, not an FK - trackers are code, not data.
    spendTrackerKey: text('spend_tracker_key'),

    status: savingsGoalStatusEnum('status').notNull().default('saving'),
    targetDate: date('target_date'),
    purchasedAt: date('purchased_at'),

    // Set once the goal has been converted into an owned asset.
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    check('savings_goals_target_positive', sql`${t.targetAmount} > 0`),
    check(
      'savings_goals_actual_price_non_negative',
      sql`${t.actualPrice} IS NULL OR ${t.actualPrice} >= 0`,
    ),
    index('savings_goals_status_idx').on(t.status),
    index('savings_goals_asset_id_idx').on(t.assetId),
  ],
);

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;

// ── Savings contributions ─────────────────────────────────────────────────────
// A dated ledger rather than one overwritable balance, so the page can show the
// saving rate and project a completion date. Mirrors asset_transactions.

export const savingsContributions = pgTable(
  'savings_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => savingsGoals.id, { onDelete: 'cascade' }),
    type: savingsContributionTypeEnum('type').notNull().default('deposit'),
    contributionDate: date('contribution_date').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check('savings_contributions_amount_positive', sql`${t.amount} > 0`),
    index('savings_contributions_goal_id_idx').on(t.goalId),
    index('savings_contributions_date_idx').on(t.contributionDate),
  ],
);

export type SavingsContribution = typeof savingsContributions.$inferSelect;
export type NewSavingsContribution = typeof savingsContributions.$inferInsert;

export const savingsGoalsRelations = relations(savingsGoals, ({ one, many }) => ({
  contributions: many(savingsContributions),
  asset: one(assets, {
    fields: [savingsGoals.assetId],
    references: [assets.id],
  }),
}));

export const savingsContributionsRelations = relations(savingsContributions, ({ one }) => ({
  goal: one(savingsGoals, {
    fields: [savingsContributions.goalId],
    references: [savingsGoals.id],
  }),
}));
