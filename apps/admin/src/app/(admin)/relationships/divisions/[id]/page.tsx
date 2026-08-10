import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getDivisionWithStatsById,
  getAllIncome,
  getAllExpenses,
  getAllInvoices,
  getProfitAndLossByDivision,
  getActiveRates,
} from '@pmg/db'
import { formatZAR, fmtDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/ui/back-button'
import { BillingStatusBadge } from '@/components/billing/billing-status-badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

interface DivisionDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: DivisionDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const division = await getDivisionWithStatsById(id)
  return { title: division ? division.name : 'Division' }
}

export default async function DivisionDetailPage({ params }: DivisionDetailPageProps) {
  const { id } = await params
  const [division, incomeEntries, expenseEntries, invoiceEntries, profitAndLossByDivision, activeRates] =
    await Promise.all([
      getDivisionWithStatsById(id),
      getAllIncome({ divisionId: id }),
      getAllExpenses({ divisionId: id }),
      getAllInvoices({ divisionId: id }),
      getProfitAndLossByDivision(),
      getActiveRates().catch(() => ({ pmg_share: 0.25 })),
    ])
  if (!division) notFound()

  // getProfitAndLossByDivision() omits divisions with no ledger activity at
  // all (zero revenue and zero expenses) — default to zeros in that case
  // rather than treating it as an error.
  const pnl = profitAndLossByDivision.find((row) => row.divisionId === id) ?? {
    divisionId: id,
    divisionName: division.name,
    totalRevenue: 0,
    totalIncome: 0,
    totalOutstandingAr: 0,
    totalExpenses: 0,
    netProfit: 0,
    marginPercent: 0,
    distributionPercent: 0,
  }
  const pmgShare = pnl.totalRevenue * activeRates.pmg_share

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/relationships/divisions" label="Divisions" />
        <h1 className="text-2xl font-semibold">{division.name}</h1>
        <Badge variant={division.isActive ? 'default' : 'secondary'}>
          {division.isActive ? 'Active' : 'Disabled'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Revenue',              value: formatZAR(pnl.totalRevenue),        cls: 'text-green-500' },
          { label: 'Cash Receipts',        value: formatZAR(pnl.totalIncome),         cls: 'text-green-500' },
          { label: 'PMG Share',            value: formatZAR(pmgShare),                cls: 'text-blue-500' },
          { label: 'Accounts Receivable',  value: formatZAR(pnl.totalOutstandingAr),  cls: 'text-amber-500' },
          { label: 'Expenses',             value: formatZAR(pnl.totalExpenses),       cls: 'text-amber-500' },
          { label: 'Net Profit',           value: formatZAR(pnl.netProfit),           cls: pnl.netProfit >= 0 ? 'text-green-500' : 'text-red-500' },
          { label: 'Margin',               value: `${pnl.marginPercent.toFixed(1)}%`, cls: pnl.marginPercent >= 0 ? 'text-green-500' : 'text-red-500' },
          { label: '% of Total Revenue',   value: `${pnl.distributionPercent.toFixed(1)}%`, cls: '' },
          { label: 'Leads',                value: String(division.leadCount),         cls: '' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-lg border p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={`text-lg font-semibold tabular-nums ${cls}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Invoices */}
      <section className="rounded-lg border p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Invoices</h2>
          <span className="text-sm font-semibold text-amber-500">{formatZAR(pnl.totalOutstandingAr)} outstanding</span>
        </div>
        {invoiceEntries.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices for this division.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceEntries.data.map((inv) => {
                const balance = Number(inv.total) - Number(inv.allocatedAmount ?? 0)
                return (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.documentNumber}</TableCell>
                    <TableCell>{inv.clientName ?? '-'}</TableCell>
                    <TableCell>{fmtDate(inv.invoiceDate)}</TableCell>
                    <TableCell>{inv.dueDate ? fmtDate(inv.dueDate) : '-'}</TableCell>
                    <TableCell><BillingStatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatZAR(Number(inv.total))}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {balance > 0 ? formatZAR(balance) : '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Payment receipts */}
      <section className="rounded-lg border p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Payment Receipts</h2>
          <span className="text-sm font-semibold text-green-500">{formatZAR(pnl.totalIncome)}</span>
        </div>
        {incomeEntries.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No income records for this division.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeEntries.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{fmtDate(e.date)}</TableCell>
                  <TableCell>{e.clientName ?? '-'}</TableCell>
                  <TableCell>{e.description ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-green-500">
                    +{formatZAR(Number(e.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Expense history */}
      <section className="rounded-lg border p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Expense History</h2>
          <span className="text-sm font-semibold text-amber-500">{formatZAR(division.totalExpenses)}</span>
        </div>
        {expenseEntries.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expense records for this division.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseEntries.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{fmtDate(e.date)}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-amber-500">
                    −{formatZAR(Number(e.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
