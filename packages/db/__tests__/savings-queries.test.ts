import { describe, it, expect, afterAll } from 'vitest';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

/**
 * Real-database tests for the savings goal aggregates.
 *
 * These MUST hit a real database. The aggregates are correlated subqueries, and
 * the bug they guard against - Drizzle rendering columns unqualified inside a
 * raw `sql` template, so `WHERE "goal_id" = "id"` binds to the subquery's own
 * id and matches nothing - produces valid SQL that silently returns 0. A mocked
 * db cannot see it, and unit-testing the pure maths cannot either: the number
 * is wrong before it ever reaches the maths.
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

const { db, savingsGoals, savingsContributions, getAllSavingsGoals, getSavingsGoalById, eq } =
  await import('../src/index');

const createdGoalIds: string[] = [];

async function makeGoal(name: string, target: string) {
  const [row] = await db
    .insert(savingsGoals)
    .values({ name, targetAmount: target })
    .returning({ id: savingsGoals.id });
  createdGoalIds.push(row!.id);
  return row!.id;
}

async function contribute(
  goalId: string,
  amount: string,
  type: 'deposit' | 'withdrawal',
  date: string,
) {
  await db.insert(savingsContributions).values({ goalId, amount, type, contributionDate: date });
}

afterAll(async () => {
  // Contributions cascade with the goal.
  for (const id of createdGoalIds) {
    await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  }
});

suite('savings goal aggregates (real database)', () => {
  it('sums deposits into `saved` rather than returning zero', async () => {
    const id = await makeGoal(`__test_sum_${Date.now()}`, '5000.00');
    await contribute(id, '2000.00', 'deposit', '2026-08-16');

    const goal = await getSavingsGoalById(id);
    expect(goal?.saved).toBe(2000);
    expect(goal?.contributionCount).toBe(1);
  });

  it('subtracts withdrawals from the running total', async () => {
    const id = await makeGoal(`__test_wd_${Date.now()}`, '5000.00');
    await contribute(id, '2000.00', 'deposit', '2026-08-01');
    await contribute(id, '1500.00', 'deposit', '2026-08-10');
    await contribute(id, '500.00', 'withdrawal', '2026-08-12');

    const goal = await getSavingsGoalById(id);
    expect(goal?.saved).toBe(3000);
    expect(goal?.contributionCount).toBe(3);
  });

  it('reports the first and last contribution dates', async () => {
    const id = await makeGoal(`__test_dates_${Date.now()}`, '5000.00');
    await contribute(id, '100.00', 'deposit', '2026-05-19');
    await contribute(id, '100.00', 'deposit', '2026-08-15');

    const goal = await getSavingsGoalById(id);
    expect(goal?.firstContribution).toBe('2026-05-19');
    expect(goal?.lastContribution).toBe('2026-08-15');
  });

  it("does not leak one goal's contributions into another", async () => {
    const a = await makeGoal(`__test_iso_a_${Date.now()}`, '5000.00');
    const b = await makeGoal(`__test_iso_b_${Date.now()}`, '5000.00');
    await contribute(a, '1000.00', 'deposit', '2026-08-16');

    expect((await getSavingsGoalById(a))?.saved).toBe(1000);
    expect((await getSavingsGoalById(b))?.saved).toBe(0);
  });

  it('returns zero for a goal with no contributions', async () => {
    const id = await makeGoal(`__test_empty_${Date.now()}`, '5000.00');

    const goal = await getSavingsGoalById(id);
    expect(goal?.saved).toBe(0);
    expect(goal?.contributionCount).toBe(0);
    expect(goal?.firstContribution).toBeNull();
  });

  it('computes the same totals in the list query as the single-goal query', async () => {
    const id = await makeGoal(`__test_parity_${Date.now()}`, '5000.00');
    await contribute(id, '750.00', 'deposit', '2026-08-16');

    const fromList = (await getAllSavingsGoals()).find((g) => g.id === id);
    const fromOne = await getSavingsGoalById(id);
    expect(fromList?.saved).toBe(750);
    expect(fromList?.saved).toBe(fromOne?.saved);
  });
});
