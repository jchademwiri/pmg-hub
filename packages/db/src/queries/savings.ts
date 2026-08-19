import { db } from '../client';
import { savingsGoals, savingsContributions } from '../schema/index';
import { sql, eq, desc, asc } from 'drizzle-orm';

export type SavingsGoalRow = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: string;
  actualPrice: string | null;
  vendor: string | null;
  productUrl: string | null;
  spendTrackerKey: string | null;
  status: 'saving' | 'purchased' | 'cancelled';
  targetDate: string | null;
  purchasedAt: string | null;
  assetId: string | null;
  notes: string | null;
  /** Net of deposits minus withdrawals. */
  saved: number;
  contributionCount: number;
  firstContribution: string | null;
  lastContribution: string | null;
};

/**
 * Net saved per goal: deposits minus withdrawals. Computed in SQL so the list
 * page does not have to load every contribution row.
 *
 * Table names are written out in full rather than interpolated as Drizzle
 * column objects. In a raw `sql` template Drizzle renders columns UNQUALIFIED
 * ("id", not "savings_goals"."id"), so a correlated reference to the outer
 * table silently binds to the subquery's own same-named column instead -
 * `WHERE "goal_id" = "id"` compares a contribution to itself and always
 * matches nothing, making every goal read as R0 saved. The aliases below keep
 * the correlation explicit.
 */
const savedExpr = sql<number>`COALESCE((
  SELECT SUM(CASE WHEN sc.type = 'withdrawal' THEN -sc.amount ELSE sc.amount END)
  FROM savings_contributions sc
  WHERE sc.goal_id = savings_goals.id
), 0)::numeric`;

const goalColumns = {
  id: savingsGoals.id,
  name: savingsGoals.name,
  description: savingsGoals.description,
  targetAmount: savingsGoals.targetAmount,
  actualPrice: savingsGoals.actualPrice,
  vendor: savingsGoals.vendor,
  productUrl: savingsGoals.productUrl,
  spendTrackerKey: savingsGoals.spendTrackerKey,
  status: savingsGoals.status,
  targetDate: sql<string | null>`${savingsGoals.targetDate}::text`,
  purchasedAt: sql<string | null>`${savingsGoals.purchasedAt}::text`,
  assetId: savingsGoals.assetId,
  notes: savingsGoals.notes,
  saved: savedExpr,
  contributionCount: sql<number>`COALESCE((
    SELECT COUNT(*) FROM savings_contributions sc
    WHERE sc.goal_id = savings_goals.id
  ), 0)::int`,
  firstContribution: sql<string | null>`(
    SELECT MIN(sc.contribution_date)::text FROM savings_contributions sc
    WHERE sc.goal_id = savings_goals.id
  )`,
  lastContribution: sql<string | null>`(
    SELECT MAX(sc.contribution_date)::text FROM savings_contributions sc
    WHERE sc.goal_id = savings_goals.id
  )`,
};

function normalise(r: Record<string, unknown>): SavingsGoalRow {
  return { ...r, saved: Number(r.saved ?? 0) } as SavingsGoalRow;
}

/** All goals, active first, newest first within each group. */
export async function getAllSavingsGoals(): Promise<SavingsGoalRow[]> {
  const rows = await db
    .select(goalColumns)
    .from(savingsGoals)
    .orderBy(
      sql`CASE ${savingsGoals.status} WHEN 'saving' THEN 0 WHEN 'purchased' THEN 1 ELSE 2 END`,
      desc(savingsGoals.createdAt),
    );

  return rows.map(normalise);
}

export async function getSavingsGoalById(id: string): Promise<SavingsGoalRow | null> {
  const rows = await db.select(goalColumns).from(savingsGoals).where(eq(savingsGoals.id, id));
  return rows[0] ? normalise(rows[0]) : null;
}

export type SavingsContributionRow = {
  id: string;
  goalId: string;
  type: 'deposit' | 'withdrawal';
  contributionDate: string;
  amount: string;
  notes: string | null;
};

/** Contributions for a goal, oldest first (running-balance order). */
export async function getContributionsForGoal(goalId: string): Promise<SavingsContributionRow[]> {
  return db
    .select({
      id: savingsContributions.id,
      goalId: savingsContributions.goalId,
      type: savingsContributions.type,
      contributionDate: sql<string>`${savingsContributions.contributionDate}::text`,
      amount: savingsContributions.amount,
      notes: savingsContributions.notes,
    })
    .from(savingsContributions)
    .where(eq(savingsContributions.goalId, goalId))
    .orderBy(asc(savingsContributions.contributionDate), asc(savingsContributions.createdAt));
}
