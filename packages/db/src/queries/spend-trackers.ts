import { db } from '../client';
import { expenses, divisions, clients } from '../schema/index';
import { sql, eq, desc, and, or, not, type SQL } from 'drizzle-orm';

/**
 * Derives a virtual expense category from free-text descriptions, so a savings
 * goal can show what the purchase would replace.
 *
 * Expense rows carry a plain-text `category` and a free-text `description`;
 * costs for one activity end up spread across several categories. Rather than
 * re-categorising history, we match on keywords - which works retroactively and
 * needs no change to how expenses are logged.
 */
export type SpendMatchConfig = {
  /** Marks a row as the activity itself, e.g. ['scan']. */
  primaryKeywords: string[];
  /**
   * Categories that mean "this row is a trip or courier, never the activity",
   * e.g. ['transport', 'travel', 'shipment'].
   */
  companionCategories: string[];
  /**
   * A companion-category row only counts when its description matches one of
   * these, e.g. ['cafe', 'print shop'].
   *
   * An earlier version attributed ANY companion row sharing a date with a
   * primary row. Measured against real data that was wrong for 54% of
   * companion spend by value - it swept in "Client meeting", "Uber to meet a
   * client" and a courier "Tender Shipment with Bolt" that merely fell on the
   * same day. Destination keywords proved exact on the same sample.
   */
  companionKeywords: string[];
};

/** `col ILIKE '%a%' OR col ILIKE '%b%' ...` */
function anyKeyword(col: SQL, keywords: string[]): SQL {
  return or(...keywords.map((k) => sql`${col} ILIKE ${`%${k}%`}`))!;
}

/**
 * Builds the primary/companion predicates for a config.
 *
 * Classification is ORDERED - category first, then description. A companion row
 * described "To and from cafe for scanning" contains the primary keyword;
 * description-first matching counted it as the activity itself and inflated the
 * total. Category wins. Do not reverse this.
 */
function buildPredicates(config: SpendMatchConfig) {
  // COALESCE guards: a NULL description makes `NOT (... OR ...)` evaluate to
  // NULL, which silently drops the row from the result set.
  const descr = sql`COALESCE(${expenses.description}, '')`;
  const categ = sql`COALESCE(${expenses.category}, '')`;

  const isCompanionCategory = anyKeyword(categ, config.companionCategories);

  const mentionsPrimary = or(
    anyKeyword(descr, config.primaryKeywords),
    anyKeyword(categ, config.primaryKeywords),
  )!;

  return {
    isPrimary: and(not(isCompanionCategory), mentionsPrimary)!,
    isCompanion: and(isCompanionCategory, anyKeyword(descr, config.companionKeywords))!,
  };
}

export type SpendRow = {
  id: string;
  date: string;
  divisionName: string;
  clientName: string | null;
  category: string;
  description: string | null;
  amount: string;
  kind: 'primary' | 'companion';
};

/** Every matched row, newest first, tagged primary or companion. */
export async function getSpendRows(config: SpendMatchConfig): Promise<SpendRow[]> {
  const { isPrimary, isCompanion } = buildPredicates(config);

  return db
    .select({
      id: expenses.id,
      date: sql<string>`${expenses.date}::text`,
      divisionName: divisions.name,
      clientName: clients.name,
      category: expenses.category,
      description: expenses.description,
      amount: expenses.amount,
      kind: sql<'primary' | 'companion'>`CASE WHEN ${isPrimary} THEN 'primary' ELSE 'companion' END`,
    })
    .from(expenses)
    .innerJoin(divisions, eq(expenses.divisionId, divisions.id))
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .where(or(isPrimary, isCompanion))
    .orderBy(desc(expenses.date));
}

export type SpendMonthSummary = {
  month: string; // YYYY-MM
  primaryCount: number;
  primaryTotal: number;
  companionCount: number;
  companionTotal: number;
};

/** Per-month totals, ascending. Months with only companion spend still appear. */
export async function getSpendMonthlySummary(
  config: SpendMatchConfig,
): Promise<SpendMonthSummary[]> {
  const { isPrimary, isCompanion } = buildPredicates(config);
  const monthExpr = sql<string>`TO_CHAR(${expenses.date}, 'YYYY-MM')`;

  const result = await db
    .select({
      month: monthExpr,
      primaryCount: sql<number>`COUNT(*) FILTER (WHERE ${isPrimary})::int`,
      primaryTotal: sql<number>`COALESCE(SUM(${expenses.amount}) FILTER (WHERE ${isPrimary}), 0)::numeric`,
      companionCount: sql<number>`COUNT(*) FILTER (WHERE ${isCompanion})::int`,
      companionTotal: sql<number>`COALESCE(SUM(${expenses.amount}) FILTER (WHERE ${isCompanion}), 0)::numeric`,
    })
    .from(expenses)
    .where(or(isPrimary, isCompanion))
    .groupBy(monthExpr)
    .orderBy(sql`TO_CHAR(${expenses.date}, 'YYYY-MM') ASC`);

  return result.map((r) => ({
    month: r.month,
    primaryCount: Number(r.primaryCount),
    primaryTotal: Number(r.primaryTotal),
    companionCount: Number(r.companionCount),
    companionTotal: Number(r.companionTotal),
  }));
}
