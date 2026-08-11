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
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const assetKindEnum = pgEnum("asset_kind", ["fixed_asset", "investment"]);

export const assetStatusEnum = pgEnum("asset_status", ["active", "disposed"]);

export const assetTransactionTypeEnum = pgEnum("asset_transaction_type", ["deposit", "withdrawal"]);

// ── assets ────────────────────────────────────────────────────────────────────
// Company-wide simple register: fixed assets (equipment, vehicles, computers) and
// investments (crypto, stocks) tracked side by side. No division scoping, no
// depreciation/valuation automation, no ledger posting - v1 is record-keeping only.

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: assetKindEnum("kind").notNull(),
    status: assetStatusEnum("status").notNull().default("active"),

    // Shared across both kinds
    name: text("name").notNull(),
    category: text("category").notNull(),
    acquisitionDate: date("acquisition_date").notNull(),
    cost: numeric("cost", { precision: 14, scale: 2 }).notNull(),
    currentValue: numeric("current_value", { precision: 14, scale: 2 }),
    notes: text("notes"),

    // Fixed-asset-only (nullable; ignored for kind = investment)
    serialNumber: text("serial_number"),
    location: text("location"),
    assignedTo: text("assigned_to"),

    // Investment-only (nullable; ignored for kind = fixed_asset)
    quantity: numeric("quantity", { precision: 20, scale: 8 }),
    unitType: text("unit_type"),

    disposedAt: date("disposed_at"),
    disposalNotes: text("disposal_notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // updatedAt is managed by the application layer on update - matches other
    // tables in this schema (see billingItems).
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("assets_cost_non_negative", sql`${t.cost} >= 0`),
    check("assets_current_value_non_negative", sql`${t.currentValue} IS NULL OR ${t.currentValue} >= 0`),
    check("assets_quantity_non_negative", sql`${t.quantity} IS NULL OR ${t.quantity} >= 0`),
    index("assets_kind_idx").on(t.kind),
    index("assets_status_idx").on(t.status),
    index("assets_category_idx").on(t.category),
    index("assets_acquisition_date_idx").on(t.acquisitionDate),
  ],
);

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

// ── asset_valuations ──────────────────────────────────────────────────────────
// Point-in-time value entries for an asset, so investments (and, if useful,
// fixed assets) can show growth/decline over time instead of a single
// overwritable current_value. Adding a valuation keeps assets.current_value in
// sync with the latest entry - still manual record-keeping, no automated pricing.

export const assetValuations = pgTable(
  "asset_valuations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    valuationDate: date("valuation_date").notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("asset_valuations_value_non_negative", sql`${t.value} >= 0`),
    index("asset_valuations_asset_id_idx").on(t.assetId),
    index("asset_valuations_valuation_date_idx").on(t.valuationDate),
  ],
);

export type AssetValuation = typeof assetValuations.$inferSelect;
export type NewAssetValuation = typeof assetValuations.$inferInsert;

// ── asset_transactions ────────────────────────────────────────────────────────
// Money moved into or out of an investment after the initial deposit
// (assets.cost): additional deposits (top-ups) and withdrawals (partial/full
// sales). Each entry can optionally move the held quantity too (buying or
// selling units of a crypto/stock position); assets.quantity is kept in sync.

export const assetTransactions = pgTable(
  "asset_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    type: assetTransactionTypeEnum("type").notNull(),
    transactionDate: date("transaction_date").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 8 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("asset_transactions_amount_non_negative", sql`${t.amount} >= 0`),
    check("asset_transactions_quantity_non_negative", sql`${t.quantity} IS NULL OR ${t.quantity} >= 0`),
    index("asset_transactions_asset_id_idx").on(t.assetId),
    index("asset_transactions_transaction_date_idx").on(t.transactionDate),
  ],
);

export type AssetTransaction = typeof assetTransactions.$inferSelect;
export type NewAssetTransaction = typeof assetTransactions.$inferInsert;

export const assetsRelations = relations(assets, ({ many }) => ({
  valuations: many(assetValuations),
  transactions: many(assetTransactions),
}));

export const assetValuationsRelations = relations(assetValuations, ({ one }) => ({
  asset: one(assets, {
    fields: [assetValuations.assetId],
    references: [assets.id],
  }),
}));

export const assetTransactionsRelations = relations(assetTransactions, ({ one }) => ({
  asset: one(assets, {
    fields: [assetTransactions.assetId],
    references: [assets.id],
  }),
}));
