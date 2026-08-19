/**
 * Pure savings-goal maths. No DB, no `server-only` - imported by both the
 * server page and the client cards, and unit-tested directly.
 */

/** Round a price up to the nearest step (default R500) to get a savings target. */
export function roundTarget(price: number, step = 500): number {
  if (!isFinite(price) || price <= 0) return 0;
  return Math.ceil(price / step) * step;
}

export type GoalProgress = {
  saved: number;
  target: number;
  remaining: number;
  /** 0-1, clamped for progress bars. */
  fraction: number;
  /** Uncapped percentage, for text ("112% funded"). */
  percent: number;
  isFunded: boolean;
};

export function computeProgress(saved: number, target: number): GoalProgress {
  const safeTarget = target > 0 ? target : 0;
  const remaining = Math.max(0, safeTarget - saved);
  const raw = safeTarget > 0 ? saved / safeTarget : 0;

  return {
    saved,
    target: safeTarget,
    remaining,
    fraction: Math.max(0, Math.min(1, raw)),
    percent: raw * 100,
    isFunded: safeTarget > 0 && saved >= safeTarget,
  };
}

/**
 * Count of distinct calendar months spanned, inclusive.
 *
 * Deliberately NOT elapsed months: a 19 May -> 15 Aug span is 2 months 27 days,
 * which rounds to 3 and overstates a monthly rate by a third even though the
 * activity touches 4 calendar months. Both dates are `YYYY-MM` or `YYYY-MM-DD`.
 */
export function monthsBetween(first: string | null, last: string | null): number {
  if (!first || !last) return 1;
  const [fy, fm] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  if (!fy || !fm || !ly || !lm) return 1;
  return Math.max(1, (ly - fy) * 12 + (lm - fm) + 1);
}

export type SavingRate = {
  perMonth: number;
  monthsSaving: number;
  /** Months until the target is met at the current rate; null if not saving. */
  monthsToTarget: number | null;
  /** ISO date (YYYY-MM-DD) the target is projected to be met; null if unknown. */
  projectedDate: string | null;
};

/**
 * Projects when the goal will be met from the observed contribution rate.
 * Returns `monthsToTarget: 0` when already funded, `null` when nothing is
 * being put away (an infinite projection is misleading as a number).
 */
export function computeSavingRate(
  saved: number,
  target: number,
  firstContribution: string | null,
  lastContribution: string | null,
  today = new Date(),
): SavingRate {
  const monthsSaving = monthsBetween(firstContribution, lastContribution);
  const perMonth = saved > 0 ? saved / monthsSaving : 0;
  const remaining = Math.max(0, target - saved);

  if (remaining === 0) {
    return { perMonth, monthsSaving, monthsToTarget: 0, projectedDate: null };
  }
  if (perMonth <= 0) {
    return { perMonth, monthsSaving, monthsToTarget: null, projectedDate: null };
  }

  const monthsToTarget = remaining / perMonth;
  const projected = new Date(today);
  projected.setMonth(projected.getMonth() + Math.ceil(monthsToTarget));

  return {
    perMonth,
    monthsSaving,
    monthsToTarget,
    projectedDate: projected.toISOString().slice(0, 10),
  };
}

export type PaybackWindow = {
  label: string;
  monthlySpend: number;
  /** Months for the purchase to pay for itself; null when nothing is spent. */
  paybackMonths: number | null;
};

/**
 * How long the purchase takes to pay for itself, given what is currently being
 * spent on the thing it replaces.
 *
 * `runningCost` is the monthly cost of owning it (consumables, subscriptions).
 * When it meets or exceeds the spend being replaced there is no saving, so
 * payback is `null` rather than a negative or infinite number.
 */
export function computePayback(
  price: number,
  monthlySpend: number,
  runningCost = 0,
  label = '',
): PaybackWindow {
  const netSaving = monthlySpend - runningCost;
  return {
    label,
    monthlySpend,
    paybackMonths: netSaving > 0 && price > 0 ? price / netSaving : null,
  };
}

export type MonthlySpend = { month: string; total: number };

/**
 * Payback across three windows rather than one blended average.
 *
 * The spread between them is the point: a single average hides whether spend is
 * ramping or tailing off, which is usually what decides whether the purchase is
 * worth making at all.
 *
 * `currentMonth` (YYYY-MM) marks the month still in progress, so the "Last 3
 * months" and "Last complete month" windows can exclude it explicitly. Without
 * it, an earlier version assumed the final entry in `monthly` was always the
 * partial current month and dropped it positionally - wrong whenever the
 * current month has no matched spend yet, since `monthly` only contains
 * months with activity: the true last complete month is then the actual last
 * entry, and dropping it silently substituted a stale one instead. "All time"
 * deliberately keeps including the partial month - it's meant to reflect
 * total spend across the full observed history, partial month included.
 */
export function computePaybackWindows(
  price: number,
  monthly: MonthlySpend[],
  runningCost = 0,
  currentMonth?: string,
): PaybackWindow[] {
  if (monthly.length === 0) return [];

  const mean = (rows: MonthlySpend[]) =>
    rows.length > 0 ? rows.reduce((s, m) => s + m.total, 0) / rows.length : 0;

  const completeMonths = currentMonth ? monthly.filter((m) => m.month !== currentMonth) : monthly;

  return [
    computePayback(price, mean(monthly), runningCost, 'All time'),
    computePayback(price, mean(completeMonths.slice(-3)), runningCost, 'Last 3 months'),
    computePayback(price, mean(completeMonths.slice(-1)), runningCost, 'Last complete month'),
  ];
}
