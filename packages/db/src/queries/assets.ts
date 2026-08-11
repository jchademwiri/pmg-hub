import { db } from "../client";
import { assets } from "../schema/assets";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;

// ── getAllAssets ──────────────────────────────────────────────────────────────

/**
 * Returns assets in the register. Defaults to active assets only.
 * Ordered by acquisition date DESC (most recently acquired first).
 */
export async function getAllAssets(filters?: {
  kind?: "fixed_asset" | "investment";
  status?: "active" | "disposed";
  category?: string;
}): Promise<AssetRow[]> {
  const conditions = [eq(assets.status, filters?.status ?? "active")];
  if (filters?.kind) conditions.push(eq(assets.kind, filters.kind));
  if (filters?.category) conditions.push(eq(assets.category, filters.category));

  return db
    .select()
    .from(assets)
    .where(and(...conditions))
    .orderBy(desc(assets.acquisitionDate));
}

// ── getAssetById ──────────────────────────────────────────────────────────────

export async function getAssetById(id: string): Promise<AssetRow | null> {
  const rows = await db.select().from(assets).where(eq(assets.id, id));
  return rows[0] ?? null;
}

// ── createAsset ───────────────────────────────────────────────────────────────

export async function createAsset(data: NewAssetRow): Promise<AssetRow> {
  const [inserted] = await db.insert(assets).values(data).returning();
  if (!inserted) throw new Error("Failed to create asset.");
  return inserted;
}

// ── updateAsset ───────────────────────────────────────────────────────────────

export async function updateAsset(
  id: string,
  data: Partial<NewAssetRow>,
): Promise<AssetRow> {
  const [updated] = await db
    .update(assets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning();
  if (!updated) throw new Error("Asset not found.");
  return updated;
}

// ── disposeAsset ──────────────────────────────────────────────────────────────

export async function disposeAsset(id: string, disposalNotes?: string): Promise<void> {
  await db
    .update(assets)
    .set({
      status: "disposed",
      disposedAt: new Date().toISOString().slice(0, 10),
      disposalNotes: disposalNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id));
}

// ── reactivateAsset ───────────────────────────────────────────────────────────

export async function reactivateAsset(id: string): Promise<void> {
  await db
    .update(assets)
    .set({ status: "active", disposedAt: null, updatedAt: new Date() })
    .where(eq(assets.id, id));
}

// ── deleteAsset ───────────────────────────────────────────────────────────────

export async function deleteAsset(id: string): Promise<void> {
  await db.delete(assets).where(eq(assets.id, id));
}

// ── getAssetsSummary ──────────────────────────────────────────────────────────

export type AssetsSummary = {
  totalFixedAssetsValue: number;
  totalInvestmentsValue: number;
  totalCount: number;
};

/**
 * Aggregates active assets by kind, using currentValue when set and falling
 * back to cost otherwise. Pure aggregation - no automated valuation logic.
 */
export async function getAssetsSummary(): Promise<AssetsSummary> {
  const rows = await db
    .select({
      kind: assets.kind,
      total: sql<string>`coalesce(sum(coalesce(${assets.currentValue}, ${assets.cost})), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(assets)
    .where(eq(assets.status, "active"))
    .groupBy(assets.kind);

  let totalFixedAssetsValue = 0;
  let totalInvestmentsValue = 0;
  let totalCount = 0;

  for (const row of rows) {
    totalCount += row.count;
    if (row.kind === "fixed_asset") totalFixedAssetsValue = Number(row.total);
    if (row.kind === "investment") totalInvestmentsValue = Number(row.total);
  }

  return { totalFixedAssetsValue, totalInvestmentsValue, totalCount };
}
