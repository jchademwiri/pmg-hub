import { DivisionBreakdownCard, type DivisionBreakdownRow } from '@/components/dashboard/division-breakdown-card'
import type { DivisionRevenue } from '@/lib/financial'

type ExpenseSnapshotProps = {
  divisions: DivisionRevenue[]
  expensesByDivision: { divisionId?: string; divisionName: string; total: number }[]
  pmgShareRate: number
}

// chart-1..5 are a monochrome sequential palette (same hue, varying lightness) and
// are not distinguishable from one another here, so divisions get real qualitative hues.
const DIVISION_COLORS: Record<string, string> = {
  'Playhouse Media Group': 'bg-chart-2',
  'Tender Edge Solutions':  'bg-amber-500',
  'Apex Web Solutions':     'bg-violet-500',
}

const DEFAULT_COLORS = ['bg-rose-500', 'bg-teal-500', 'bg-muted-foreground/40']

const dotColorFor = (name: string, i: number) => DIVISION_COLORS[name] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]

const TITLE = 'Division Financial Breakdown'

export function ExpenseSnapshot({ divisions, expensesByDivision, pmgShareRate }: ExpenseSnapshotProps) {
  const revenueByName = new Map(divisions.map((d) => [d.divisionName, d]))
  const expenseByName = new Map(expensesByDivision.map((d) => [d.divisionName, d]))
  // Union of both lists: a division can have revenue with no expenses (or vice versa)
  // and should still show up, matching what Revenue by Division used to show.
  const names = Array.from(new Set([...revenueByName.keys(), ...expenseByName.keys()]))

  const totalExpenses = expensesByDivision.reduce((sum, d) => sum + d.total, 0)

  if (names.length === 0 || totalExpenses === 0) {
    return (
      <DivisionBreakdownCard
        title={TITLE}
        totals={[]}
        rows={[]}
        emptyMessage="No expenses recorded yet."
      />
    )
  }

  const totalRevenue = names.reduce((sum, name) => sum + (revenueByName.get(name)?.total ?? 0), 0)
  const totalPmgShare = totalRevenue * pmgShareRate
  const totalNet = totalRevenue - totalExpenses

  const rows: DivisionBreakdownRow[] = names
    .map((name) => {
      const revenue = revenueByName.get(name)
      const expense = expenseByName.get(name)
      const revenueTotal = revenue?.total ?? 0
      const expenseTotal = expense?.total ?? 0
      const pmgShare = revenueTotal * pmgShareRate
      const net = revenueTotal - expenseTotal
      const pct = Math.round((expenseTotal / totalExpenses) * 100)

      return {
        divisionId: revenue?.divisionId ?? expense?.divisionId,
        divisionName: name,
        pct,
        metrics: [
          { label: 'Revenue', value: revenueTotal, colorClass: 'text-emerald-600' },
          { label: 'PMG Share', value: pmgShare, colorClass: 'text-blue-600' },
          { label: 'Expenses', value: expenseTotal, colorClass: 'text-red-600' },
          { label: 'Net', value: net, colorClass: net >= 0 ? 'text-emerald-600' : 'text-red-600' },
        ],
      }
    })
    .sort((a, b) => (expenseByName.get(b.divisionName)?.total ?? 0) - (expenseByName.get(a.divisionName)?.total ?? 0))

  return (
    <DivisionBreakdownCard
      title={TITLE}
      totals={[
        { label: 'Revenue', value: totalRevenue, colorClass: 'text-emerald-600' },
        { label: 'PMG Share', value: totalPmgShare, colorClass: 'text-blue-600' },
        { label: 'Expenses', value: totalExpenses, colorClass: 'text-red-600' },
        { label: 'Net', value: totalNet, colorClass: totalNet >= 0 ? 'text-emerald-600' : 'text-red-600' },
      ]}
      rows={rows}
      emptyMessage="No expenses recorded yet."
      linkBase="/finance/expenses"
      dotColorFor={dotColorFor}
    />
  )
}
