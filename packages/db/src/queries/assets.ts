import { db } from '../client';
import { assets, assetValuations, assetTransactions } from '../schema/assets';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;
export type AssetValuationRow = typeof assetValuations.$inferSelect;
export type NewAssetValuationRow = typeof assetValuations.$inferInsert;
export type AssetTransactionRow = typeof assetTransactions.$inferSelect;
export type NewAssetTransactionRow = typeof assetTransactions.$inferInsert;

// ── getAllAssets ──────────────────────────────────────────────────────────────

/**
 * Returns assets in the register. Defaults to active assets only.
 * Ordered by acquisition date DESC (most recently acquired first).
 */
export async function getAllAssets(filters?: {
  kind?: 'fixed_asset' | 'investment';
  status?: 'active' | 'disposed';
  category?: string;
}): Promise<AssetRow[]> {
  const conditions = [eq(assets.status, filters?.status ?? 'active')];
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
  if (!inserted) throw new Error('Failed to create asset.');
  return inserted;
}

// ── updateAsset ───────────────────────────────────────────────────────────────

export async function updateAsset(id: string, data: Partial<NewAssetRow>): Promise<AssetRow> {
  const [updated] = await db
    .update(assets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning();
  if (!updated) throw new Error('Asset not found.');
  return updated;
}

// ── disposeAsset ──────────────────────────────────────────────────────────────

export async function disposeAsset(id: string, disposalNotes?: string): Promise<void> {
  await db
    .update(assets)
    .set({
      status: 'disposed',
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
    .set({ status: 'active', disposedAt: null, updatedAt: new Date() })
    .where(eq(assets.id, id));
}

// ── hasAssetHistory ───────────────────────────────────────────────────────────

/**
 * Whether an asset has any recorded valuations or deposit/withdrawal
 * transactions. Used to steer users toward disposing (not deleting) assets
 * that would otherwise silently lose that history on cascade delete.
 */
export async function hasAssetHistory(id: string): Promise<boolean> {
  const [[valuation], [transaction]] = await Promise.all([
    db
      .select({ id: assetValuations.id })
      .from(assetValuations)
      .where(eq(assetValuations.assetId, id))
      .limit(1),
    db
      .select({ id: assetTransactions.id })
      .from(assetTransactions)
      .where(eq(assetTransactions.assetId, id))
      .limit(1),
  ]);
  return Boolean(valuation || transaction);
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
    .where(eq(assets.status, 'active'))
    .groupBy(assets.kind);

  let totalFixedAssetsValue = 0;
  let totalInvestmentsValue = 0;
  let totalCount = 0;

  for (const row of rows) {
    totalCount += row.count;
    if (row.kind === 'fixed_asset') totalFixedAssetsValue = Number(row.total);
    if (row.kind === 'investment') totalInvestmentsValue = Number(row.total);
  }

  return { totalFixedAssetsValue, totalInvestmentsValue, totalCount };
}

// ── getAssetValuations ────────────────────────────────────────────────────────

/**
 * Returns an asset's valuation history, most recent first.
 */
export async function getAssetValuations(assetId: string): Promise<AssetValuationRow[]> {
  return db
    .select()
    .from(assetValuations)
    .where(eq(assetValuations.assetId, assetId))
    .orderBy(desc(assetValuations.valuationDate), desc(assetValuations.createdAt));
}

// ── addAssetValuation ─────────────────────────────────────────────────────────

/**
 * Records a new valuation entry and, if it's the most recent by date,
 * syncs it onto assets.currentValue so summary cards and the register
 * table stay in step with the latest recorded value.
 */
export async function addAssetValuation(
  assetId: string,
  data: { valuationDate: string; value: string; notes?: string | null },
): Promise<AssetValuationRow> {
  const [inserted] = await db
    .insert(assetValuations)
    .values({ assetId, ...data })
    .returning();
  if (!inserted) throw new Error('Failed to record valuation.');

  await syncCurrentValueFromLatestValuation(assetId);

  return inserted;
}

// ── deleteAssetValuation ──────────────────────────────────────────────────────

export async function deleteAssetValuation(id: string, assetId: string): Promise<void> {
  await db.delete(assetValuations).where(eq(assetValuations.id, id));
  await syncCurrentValueFromLatestValuation(assetId);
}

// ── syncCurrentValueFromLatestValuation ──────────────────────────────────────

async function syncCurrentValueFromLatestValuation(assetId: string): Promise<void> {
  const [latest] = await db
    .select({ value: assetValuations.value })
    .from(assetValuations)
    .where(eq(assetValuations.assetId, assetId))
    .orderBy(desc(assetValuations.valuationDate), desc(assetValuations.createdAt))
    .limit(1);

  await db
    .update(assets)
    .set({ currentValue: latest?.value ?? null, updatedAt: new Date() })
    .where(eq(assets.id, assetId));
}

// ── getAssetTransactions ──────────────────────────────────────────────────────

/**
 * Returns an asset's deposit/withdrawal history (money moved after the
 * initial deposit recorded as assets.cost), most recent first.
 */
export async function getAssetTransactions(assetId: string): Promise<AssetTransactionRow[]> {
  return db
    .select()
    .from(assetTransactions)
    .where(eq(assetTransactions.assetId, assetId))
    .orderBy(desc(assetTransactions.transactionDate), desc(assetTransactions.createdAt));
}

// ── addAssetTransaction ───────────────────────────────────────────────────────

/**
 * Records a deposit (top-up) or withdrawal (sale) on an investment. If a
 * quantity is given (e.g. buying/selling units of a crypto/stock position),
 * it's added onto or subtracted from the asset's running quantity.
 */
export async function addAssetTransaction(
  assetId: string,
  data: {
    type: 'deposit' | 'withdrawal';
    transactionDate: string;
    amount: string;
    quantity?: string | null;
    notes?: string | null;
  },
): Promise<AssetTransactionRow> {
  const [inserted] = await db
    .insert(assetTransactions)
    .values({ assetId, ...data })
    .returning();
  if (!inserted) throw new Error('Failed to record transaction.');

  if (data.quantity != null) {
    const delta =
      data.type === 'withdrawal' ? sql`-${data.quantity}::numeric` : sql`${data.quantity}::numeric`;
    await db
      .update(assets)
      .set({
        quantity: sql`greatest(coalesce(${assets.quantity}, 0) + ${delta}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId));
  }

  return inserted;
}

// ── deleteAssetTransaction ────────────────────────────────────────────────────

export async function deleteAssetTransaction(id: string, assetId: string): Promise<void> {
  const [txn] = await db
    .select({ type: assetTransactions.type, quantity: assetTransactions.quantity })
    .from(assetTransactions)
    .where(eq(assetTransactions.id, id));

  await db.delete(assetTransactions).where(eq(assetTransactions.id, id));

  if (txn?.quantity != null) {
    // Reverse the original effect on quantity.
    const delta =
      txn.type === 'withdrawal' ? sql`${txn.quantity}::numeric` : sql`-${txn.quantity}::numeric`;
    await db
      .update(assets)
      .set({
        quantity: sql`greatest(coalesce(${assets.quantity}, 0) + ${delta}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId));
  }
}

// ── getAssetTotalInvested ─────────────────────────────────────────────────────

/**
 * Net capital currently invested: the initial deposit (assets.cost) plus
 * every subsequent deposit, minus every withdrawal.
 */
export async function getAssetTotalInvested(assetId: string): Promise<number> {
  const asset = await getAssetById(assetId);
  if (!asset) return 0;

  const rows = await db
    .select({
      type: assetTransactions.type,
      total: sql<string>`coalesce(sum(${assetTransactions.amount}), 0)`,
    })
    .from(assetTransactions)
    .where(eq(assetTransactions.assetId, assetId))
    .groupBy(assetTransactions.type);

  let net = Number(asset.cost);
  for (const row of rows) {
    net += row.type === 'withdrawal' ? -Number(row.total) : Number(row.total);
  }
  return net;
}
