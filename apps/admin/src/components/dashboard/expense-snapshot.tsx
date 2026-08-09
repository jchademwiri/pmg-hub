import { DivisionBreakdownCard, type DivisionBreakdownRow } from '@/components/dashboard/division-breakdown-card'
import type { DivisionRevenue } from '@/lib/financial'

type ExpenseSnapshotProps = {
  divisions: DivisionRevenue[]
  expensesByDivision: { divisionId?: string; divisionName: string; total: number }[]
  arByDivision: DivisionRevenue[]
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

export function ExpenseSnapshot({ divisions, expensesByDivision, arByDivision, pmgShareRate }: ExpenseSnapshotProps) {
  const receiptsByName = new Map(divisions.map((d) => [d.divisionName, d]))
  const expenseByName = new Map(expensesByDivision.map((d) => [d.divisionName, d]))
  const arByName = new Map(arByDivision.map((d) => [d.divisionName, d]))
  // Union of all three lists: a division can have cash receipts with no expenses (or
  // vice versa), or still-outstanding AR with no receipts yet, and should still show up.
  const names = Array.from(new Set([...receiptsByName.keys(), ...expenseByName.keys(), ...arByName.keys()]))

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

  const totalCashReceipts = names.reduce((sum, name) => sum + (receiptsByName.get(name)?.total ?? 0), 0)
  const totalPmgShare = totalCashReceipts * pmgShareRate
  const totalAR = names.reduce((sum, name) => sum + (arByName.get(name)?.total ?? 0), 0)
  const totalNet = totalCashReceipts - totalExpenses

  const rows: DivisionBreakdownRow[] = names
    .map((name) => {
      const receipts = receiptsByName.get(name)
      const expense = expenseByName.get(name)
      const ar = arByName.get(name)
      const cashReceiptsTotal = receipts?.total ?? 0
      const expenseTotal = expense?.total ?? 0
      const arTotal = ar?.total ?? 0
      const pmgShare = cashReceiptsTotal * pmgShareRate
      const net = cashReceiptsTotal - expenseTotal
      const pct = Math.round((expenseTotal / totalExpenses) * 100)

      return {
        divisionId: receipts?.divisionId ?? expense?.divisionId ?? ar?.divisionId,
        divisionName: name,
        pct,
        metrics: [
          { label: 'Cash Receipts', value: cashReceiptsTotal, colorClass: 'text-emerald-600' },
          { label: 'PMG Share', value: pmgShare, colorClass: 'text-blue-600' },
          { label: 'Accounts Receivable', value: arTotal, colorClass: 'text-violet-600' },
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
        { label: 'Cash Receipts', value: totalCashReceipts, colorClass: 'text-emerald-600' },
        { label: 'PMG Share', value: totalPmgShare, colorClass: 'text-blue-600' },
        { label: 'AR', value: totalAR, colorClass: 'text-violet-600' },
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
