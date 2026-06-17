import { db } from "../client";
import { distributionSettings } from "../schema/distribution-settings";
import { eq, and, lte, or, isNull, desc, sql } from "drizzle-orm";

/**
 * Rate keys that are managed in the distribution_settings table.
 * Mirrors ACCOUNT_KEYS from accounts.ts but used for DB queries.
 */
export const RATE_KEYS = ["pmg_share", "salary", "reinvest", "reserve", "flex"] as const;
export type RateKey = (typeof RATE_KEYS)[number];

export type ActiveRates = {
  pmg_share: number;
  salary: number;
  reinvest: number;
  reserve: number;
  flex: number;
};

/**
 * Fetches all active rates as of a specific date in a single query.
 * Uses the most recent rate whose effectiveFrom <= date and (effectiveTo is null or >= date).
 * Falls back to hardcoded defaults if no DB rows exist.
 */
export async function getActiveRates(
  asOfDate: Date = new Date()
): Promise<ActiveRates> {
  const dateStr = asOfDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // Single query: fetch the most recent active rate for each key as of the given date
  let rows;
  try {
    rows = await db
      .select({
      rateKey: distributionSettings.rateKey,
      rateValue: distributionSettings.rateValue,
      effectiveFrom: distributionSettings.effectiveFrom,
      effectiveTo: distributionSettings.effectiveTo,
    })
    .from(distributionSettings)
    .where(
      and(
        eq(distributionSettings.isActive, true),
        sql`${distributionSettings.effectiveFrom} <= ${dateStr}::date`,
      )
    )
    .orderBy(desc(distributionSettings.effectiveFrom));
  } catch {
    // Table may not exist yet (e.g. before migration runs on Vercel) — fall back to defaults
    return {
      pmg_share: getDefaultRate('pmg_share'),
      salary: getDefaultRate('salary'),
      reinvest: getDefaultRate('reinvest'),
      reserve: getDefaultRate('reserve'),
      flex: getDefaultRate('flex'),
    };
  }

  // Group by rateKey and take the most recent (first after ORDER BY desc)
  const rateMap = new Map<string, number>();
  for (const row of rows) {
    if (rateMap.has(row.rateKey)) continue; // already have the most recent
    // Skip if effectiveTo has passed
    if (row.effectiveTo && row.effectiveTo.toISOString().slice(0, 10) < dateStr) continue;
    rateMap.set(row.rateKey, parseFloat(row.rateValue));
  }

  const rates: ActiveRates = {
    pmg_share: rateMap.get("pmg_share") ?? getDefaultRate("pmg_share"),
    salary: rateMap.get("salary") ?? getDefaultRate("salary"),
    reinvest: rateMap.get("reinvest") ?? getDefaultRate("reinvest"),
    reserve: rateMap.get("reserve") ?? getDefaultRate("reserve"),
    flex: rateMap.get("flex") ?? getDefaultRate("flex"),
  };

  return rates;
}

/**
 * Fetches the active rate for a single key as of a specific date.
 * Uses getActiveRates internally (single query) for efficiency.
 */
export async function getActiveRateForKey(
  rateKey: RateKey,
  asOfDate: Date = new Date()
): Promise<number> {
  const rates = await getActiveRates(asOfDate);
  return rates[rateKey];
}

/**
 * Fetches all distribution settings rows (for admin UI display).
 */
export async function getAllDistributionSettings() {
  return await db
    .select()
    .from(distributionSettings)
    .orderBy(desc(distributionSettings.effectiveFrom));
}

/**
 * Returns the latest (most recent effectiveFrom) active rate for each key.
 * Used by the distributions Rules tab to show current rates.
 */
export async function getCurrentRates(): Promise<
  { rateKey: string; rateValue: number; effectiveFrom: string; description: string | null }[]
> {
  // For each rate key, get the most recent active rate
  const results = await Promise.all(
    RATE_KEYS.map(async (key) => {
      const [row] = await db
        .select({
          rateKey: distributionSettings.rateKey,
          rateValue: distributionSettings.rateValue,
          effectiveFrom: distributionSettings.effectiveFrom,
          description: distributionSettings.description,
        })
        .from(distributionSettings)
        .where(
          and(
            eq(distributionSettings.rateKey, key),
            eq(distributionSettings.isActive, true)
          )
        )
        .orderBy(desc(distributionSettings.effectiveFrom))
        .limit(1);

      return row ?? {
        rateKey: key,
        rateValue: String(getDefaultRate(key)),
        effectiveFrom: new Date('2026-03-01'),
        description: 'System default',
      };
    })
  );

  return results.map((r) => ({
    rateKey: r.rateKey,
    rateValue: parseFloat(r.rateValue),
    effectiveFrom: r.effectiveFrom instanceof Date
      ? r.effectiveFrom.toISOString().slice(0, 10)
      : String(r.effectiveFrom),
    description: r.description,
  }));
}

/**
 * Returns hardcoded defaults as fallback when no DB settings exist.
 * These mirror the original ACCOUNT_RATES and PROFIT_POOL_RATES constants.
 */
function getDefaultRate(rateKey: string): number {
  const defaults: Record<string, number> = {
    pmg_share: 0.25,
    salary: 0.35,
    reinvest: 0.30,
    reserve: 0.30,
    flex: 0.05,
  };
  return defaults[rateKey] ?? 0;
}
