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
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const assetKindEnum = pgEnum("asset_kind", ["fixed_asset", "investment"]);

export const assetStatusEnum = pgEnum("asset_status", ["active", "disposed"]);

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
