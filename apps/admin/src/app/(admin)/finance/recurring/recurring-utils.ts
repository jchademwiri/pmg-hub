export type RecurringFrequency = 'monthly' | 'quarterly' | 'semi_annually' | 'annually';

export type DueState = 'overdue' | 'due_soon' | 'this_month' | 'upcoming' | 'inactive';

const FREQUENCY_MONTHS: Record<RecurringFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annually: 6,
  annually: 12,
};

/**
 * Normalizes any recurring amount to its monthly equivalent:
 * monthly / 1, quarterly / 3, semi_annually / 6, annually / 12.
 */
export function toMonthlyAmount(amount: number, frequency?: string | null): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const divisor = FREQUENCY_MONTHS[(frequency as RecurringFrequency) ?? 'monthly'] ?? 1;
  return amount / divisor;
}

/**
 * Computes day difference (target - today) for YYYY-MM-DD strings in UTC
 * to avoid DST/timezone drift.
 */
function diffDaysISO(targetDateStr: string, todayStr: string): number {
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [ny, nm, nd] = todayStr.split('-').map(Number);
  if (!ty || !tm || !td || !ny || !nm || !nd) return 9999;
  const targetMs = Date.UTC(ty, tm - 1, td);
  const todayMs = Date.UTC(ny, nm - 1, nd);
  return Math.round((targetMs - todayMs) / 86_400_000);
}

/**
 * Classifies a schedule's next date relative to `todayStr` (YYYY-MM-DD).
 */
export function getDueState(
  dateStr: string | null | undefined,
  status: string,
  todayStr: string,
): DueState {
  if (status !== 'active' || !dateStr) return 'inactive';
  if (dateStr < todayStr) return 'overdue';
  const daysDiff = diffDaysISO(dateStr, todayStr);
  if (daysDiff <= 14) return 'due_soon';
  if (dateStr.slice(0, 7) === todayStr.slice(0, 7)) return 'this_month';
  return 'upcoming';
}

export interface RecurringInvoiceLike {
  status: string;
  frequency?: string | null;
  total: string | number;
  nextRunDate?: string | null;
  clientId?: string | null;
  clientName?: string | null;
}

export interface RecurringExpenseLike {
  status: string;
  frequency?: string | null;
  amount: string | number;
  nextDueDate?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  vendorName?: string | null;
  notes?: string | null;
}

export interface RecurringKpis {
  monthlyIn: number;
  activeInCount: number;
  periodicInCount: number;
  monthlyOut: number;
  ownOutCount: number;
  clientOutCount: number;
  netMonthly: number;
  overdueOutCount: number;
  overdueOutTotal: number;
  dueSoonOutCount: number;
  dueSoonOutTotal: number;
  dueThisMonthOutCount: number;
  dueThisMonthOutTotal: number;
  dueThisMonthInCount: number;
  dueThisMonthInTotal: number;
}

export function computeRecurringKpis(
  invoices: RecurringInvoiceLike[],
  expenses: RecurringExpenseLike[],
  todayStr: string,
): RecurringKpis {
  const currentMonth = todayStr.slice(0, 7);

  let monthlyIn = 0;
  let activeInCount = 0;
  let periodicInCount = 0;
  let dueThisMonthInCount = 0;
  let dueThisMonthInTotal = 0;

  for (const inv of invoices) {
    if (inv.status !== 'active') continue;
    const total = typeof inv.total === 'number' ? inv.total : parseFloat(inv.total) || 0;
    activeInCount += 1;
    if (inv.frequency && inv.frequency !== 'monthly') {
      periodicInCount += 1;
    }
    monthlyIn += toMonthlyAmount(total, inv.frequency);
    if (inv.nextRunDate && inv.nextRunDate.startsWith(currentMonth)) {
      dueThisMonthInCount += 1;
      dueThisMonthInTotal += total;
    }
  }

  let monthlyOut = 0;
  let ownOutCount = 0;
  let clientOutCount = 0;
  let overdueOutCount = 0;
  let overdueOutTotal = 0;
  let dueSoonOutCount = 0;
  let dueSoonOutTotal = 0;
  let dueThisMonthOutCount = 0;
  let dueThisMonthOutTotal = 0;

  for (const exp of expenses) {
    if (exp.status !== 'active') continue;
    const amount = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
    if (exp.clientId) clientOutCount += 1;
    else ownOutCount += 1;

    monthlyOut += toMonthlyAmount(amount, exp.frequency);

    const state = getDueState(exp.nextDueDate, exp.status, todayStr);
    if (state === 'overdue') {
      overdueOutCount += 1;
      overdueOutTotal += amount;
    } else if (state === 'due_soon') {
      dueSoonOutCount += 1;
      dueSoonOutTotal += amount;
    }

    if (exp.nextDueDate && exp.nextDueDate.startsWith(currentMonth)) {
      dueThisMonthOutCount += 1;
      dueThisMonthOutTotal += amount;
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    monthlyIn: round2(monthlyIn),
    activeInCount,
    periodicInCount,
    monthlyOut: round2(monthlyOut),
    ownOutCount,
    clientOutCount,
    netMonthly: round2(monthlyIn - monthlyOut),
    overdueOutCount,
    overdueOutTotal: round2(overdueOutTotal),
    dueSoonOutCount,
    dueSoonOutTotal: round2(dueSoonOutTotal),
    dueThisMonthOutCount,
    dueThisMonthOutTotal: round2(dueThisMonthOutTotal),
    dueThisMonthInCount,
    dueThisMonthInTotal: round2(dueThisMonthInTotal),
  };
}

export interface ClientHostingMarginRow {
  clientId: string;
  clientName: string;
  monthlyRevenue: number;
  monthlyCost: number;
  netMonthly: number;
  marginPercent: number | null;
  unbilled: boolean;
  vendors: string[];
}

/**
 * Compares normalized monthly recurring revenue vs client-linked recurring costs
 * per client, surfacing unbilled client hosting/domains (revenue = 0, cost > 0)
 * first so leakage is immediately visible.
 */
export function computeClientHostingMargins(
  invoices: RecurringInvoiceLike[],
  expenses: RecurringExpenseLike[],
): ClientHostingMarginRow[] {
  const byClient = new Map<
    string,
    { clientName: string; monthlyRevenue: number; monthlyCost: number; vendors: Set<string> }
  >();

  for (const exp of expenses) {
    if (exp.status !== 'active' || !exp.clientId) continue;
    const amount = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
    const entry = byClient.get(exp.clientId) ?? {
      clientName: exp.clientName || 'Unknown Client',
      monthlyRevenue: 0,
      monthlyCost: 0,
      vendors: new Set<string>(),
    };
    entry.monthlyCost += toMonthlyAmount(amount, exp.frequency);
    if (exp.vendorName) {
      const label = exp.notes?.trim() ? `${exp.vendorName} (${exp.notes.trim()})` : exp.vendorName;
      entry.vendors.add(label);
    }
    byClient.set(exp.clientId, entry);
  }

  for (const inv of invoices) {
    if (inv.status !== 'active' || !inv.clientId) continue;
    const total = typeof inv.total === 'number' ? inv.total : parseFloat(inv.total) || 0;
    const entry = byClient.get(inv.clientId) ?? {
      clientName: inv.clientName || 'Unknown Client',
      monthlyRevenue: 0,
      monthlyCost: 0,
      vendors: new Set<string>(),
    };
    entry.monthlyRevenue += toMonthlyAmount(total, inv.frequency);
    byClient.set(inv.clientId, entry);
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return Array.from(byClient.entries())
    .filter(([, v]) => v.monthlyCost > 0)
    .map(([clientId, v]) => {
      const monthlyRevenue = round2(v.monthlyRevenue);
      const monthlyCost = round2(v.monthlyCost);
      const netMonthly = round2(monthlyRevenue - monthlyCost);
      const unbilled = monthlyCost > 0 && monthlyRevenue <= 0;
      const marginPercent =
        monthlyRevenue > 0 ? Math.round((netMonthly / monthlyRevenue) * 1000) / 10 : null;
      return {
        clientId,
        clientName: v.clientName,
        monthlyRevenue,
        monthlyCost,
        netMonthly,
        marginPercent,
        unbilled,
        vendors: Array.from(v.vendors),
      };
    })
    .sort((a, b) => {
      if (a.unbilled !== b.unbilled) return a.unbilled ? -1 : 1;
      return a.netMonthly - b.netMonthly;
    });
}

export function formatFrequencyLabel(freq?: string | null): string {
  switch (freq) {
    case 'quarterly':
      return 'Quarterly (3 Mo)';
    case 'semi_annually':
      return 'Bi-Annually (6 Mo)';
    case 'annually':
      return 'Yearly (12 Mo)';
    case 'monthly':
    default:
      return 'Monthly';
  }
}

export function defaultNextRunDate(todayStr?: string): string {
  const base = todayStr ? new Date(`${todayStr}T00:00:00Z`) : new Date();
  const cycleDay = 26;
  let year = base.getUTCFullYear();
  let month = base.getUTCMonth();
  if (base.getUTCDate() > cycleDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(cycleDay, maxDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function defaultNextDueDate(cycleDay = 1, todayStr?: string): string {
  const base = todayStr ? new Date(`${todayStr}T00:00:00Z`) : new Date();
  let year = base.getUTCFullYear();
  let month = base.getUTCMonth();
  if (base.getUTCDate() > cycleDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(Math.max(1, cycleDay), maxDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function advanceDueDatePreview(
  dateStr: string,
  cycleDay = 1,
  frequency: RecurringFrequency = 'monthly',
): string {
  const [y, m] = dateStr.split('-').map(Number);
  if (!y || !m) return dateStr;
  const stepMonths = FREQUENCY_MONTHS[frequency] ?? 1;
  const totalMonths = y * 12 + (m - 1) + stepMonths;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = totalMonths % 12;
  const maxDays = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(1, cycleDay), maxDays);
  return new Date(Date.UTC(nextYear, nextMonth, safeDay)).toISOString().slice(0, 10);
}
