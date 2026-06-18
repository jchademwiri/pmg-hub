import type { Metadata } from 'next'
import { getTotalRevenue, getTotalExpenses, getRevenueByDivision, getExpensesByCategoryForYear, getAllIncome, getAllExpenses, getActiveRates } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { getSASTParts } from '@/lib/format'
import { FinanceOverviewClient } from './finance-overview-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Finance' }

export default async function FinanceOverviewPage() {
  const { year, month } = getSASTParts()
  const fiscalYear = month < 2 ? year - 1 : year

  const [revenue, expenses, rates, revenueByDivision, expensesByCategory, incomeData, expenseData] = await Promise.all([
    getTotalRevenue(),
    getTotalExpenses(),
    getActiveRates(),
    getRevenueByDivision(),
    getExpensesByCategoryForYear(fiscalYear),
    getAllIncome({}, { page: 1, pageSize: 5 }),
    getAllExpenses({}, { page: 1, pageSize: 5 }),
  ])

  const pmgShare = revenue * rates.pmg_share
  const profitPool = revenue - expenses - pmgShare

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`R${revenue.toLocaleString()} revenue`} />

      <div>
        <h2 className="text-lg font-semibold">Finance Overview</h2>
        <p className="text-sm text-muted-foreground">
          Cash movement and business financial management.
        </p>
      </div>

      <FinanceOverviewClient
        summary={{ revenue, expenses, pmgShare, profitPool }}
        revenueByDivision={revenueByDivision}
        expensesByCategory={expensesByCategory}
        recentIncome={incomeData.data.map((r) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          amount: Number(r.amount),
          divisionName: r.divisionName,
        }))}
        recentExpenses={expenseData.data.map((r) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          amount: Number(r.amount),
          category: r.category,
        }))}
      />
    </div>
  )
}
