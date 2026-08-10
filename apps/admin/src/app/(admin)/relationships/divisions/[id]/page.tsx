import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getDivisionWithStatsById,
  getAllIncome,
  getAllExpenses,
  getAllInvoices,
  getAllQuotations,
  getProfitAndLossByDivision,
  getActiveRates,
} from '@pmg/db'
import { formatZAR, fmtDate, getSASTParts } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/ui/back-button'
import { SetPageLabel } from '@/components/navigation/page-header-context'
import { Pagination } from '@/components/ui/pagination'
import { ClickableTableRow } from '@/components/ui/clickable-table-row'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 5

interface DivisionDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ invPage?: string; quotePage?: string; payPage?: string; expPage?: string }>
}

export async function generateMetadata({ params }: DivisionDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const division = await getDivisionWithStatsById(id)
  return { title: division ? division.name : 'Division' }
}

export default async function DivisionDetailPage({ params, searchParams }: DivisionDetailPageProps) {
  const { id } = await params
  const sp = await searchParams
  const invPage = Math.max(1, Number(sp.invPage) || 1)
  const quotePage = Math.max(1, Number(sp.quotePage) || 1)
  const payPage = Math.max(1, Number(sp.payPage) || 1)
  const expPage = Math.max(1, Number(sp.expPage) || 1)

  // Mirrors /relationships/divisions and /insights/financial-reports?type=division-performance's
  // fiscal-year labeling convention (label = the calendar year the FY ends in).
  const { year, month } = getSASTParts()
  const fiscalYearStart = month < 2 ? year - 1 : year
  const period = `${fiscalYearStart + 1}-FY`

  const [division, incomeEntries, expenseEntries, invoiceEntries, quoteEntries, profitAndLossByDivision, activeRates] =
    await Promise.all([
      getDivisionWithStatsById(id),
      getAllIncome({ divisionId: id, year: fiscalYearStart }, { page: payPage, pageSize: PAGE_SIZE }),
      getAllExpenses({ divisionId: id, year: fiscalYearStart }, { page: expPage, pageSize: PAGE_SIZE }),
      getAllInvoices({ divisionId: id, year: fiscalYearStart }, { page: invPage, pageSize: PAGE_SIZE }),
      getAllQuotations({ divisionId: id, year: fiscalYearStart }, { page: quotePage, pageSize: PAGE_SIZE }),
      getProfitAndLossByDivision(period),
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
    totalBadDebt: 0,
    netProfit: 0,
    marginPercent: 0,
    distributionPercent: 0,
  }
  const pmgShare = pnl.totalRevenue * activeRates.pmg_share

  // "Expenses" excludes Bad Debt Expense — that's an AR write-off, not an
  // operating cost, and gets its own card below. Net Profit / Margin still
  // subtract it (via pnl.netProfit), since it's a real expense for
  // profitability purposes — only this display total omits it.
  const operatingExpenses = pnl.totalExpenses - pnl.totalBadDebt

  // Preserve the other three page params when linking a different section's pagination.
  const params_ = { invPage: String(invPage), quotePage: String(quotePage), payPage: String(payPage), expPage: String(expPage) }
  function hrefFor(key: keyof typeof params_, page: number) {
    const p = new URLSearchParams(params_)
    p.set(key, String(page))
    return `?${p.toString()}`
  }

  return (
    <div className="flex flex-col gap-8">
      <SetPageLabel value={division.name} />
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
          { label: 'Expenses',             value: formatZAR(operatingExpenses),       cls: 'text-amber-500' },
          { label: 'Net Profit',           value: formatZAR(pnl.netProfit),           cls: pnl.netProfit >= 0 ? 'text-green-500' : 'text-red-500' },
          { label: 'Margin',               value: `${pnl.marginPercent.toFixed(1)}%`, cls: pnl.marginPercent >= 0 ? 'text-green-500' : 'text-red-500' },
          { label: '% of Total Revenue',   value: `${pnl.distributionPercent.toFixed(1)}%`, cls: '' },
          { label: 'Leads',                value: String(division.leadCount),         cls: '' },
          { label: 'Bad Debt',             value: formatZAR(pnl.totalBadDebt),        cls: pnl.totalBadDebt > 0 ? 'text-red-500' : '' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-lg border p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={`text-lg font-semibold tabular-nums ${cls}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Transaction cards — 2 per row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices */}
        <section className="rounded-lg border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Invoices</h2>
            <span className="text-sm font-semibold text-amber-500">{formatZAR(pnl.totalOutstandingAr)} outstanding</span>
          </div>
          {invoiceEntries.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices for this division.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceEntries.data.map((inv) => {
                    const balance = Number(inv.total) - Number(inv.allocatedAmount ?? 0)
                    return (
                      <ClickableTableRow key={inv.id} href={`/billing/invoices/${inv.id}`}>
                        <TableCell className="font-medium">{inv.documentNumber}</TableCell>
                        <TableCell>{inv.dueDate ? fmtDate(inv.dueDate) : '-'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatZAR(Number(inv.total))}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {balance > 0 ? formatZAR(balance) : '-'}
                        </TableCell>
                      </ClickableTableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pagination
                currentPage={invPage}
                totalPages={Math.ceil(invoiceEntries.total / PAGE_SIZE)}
                buildHref={(p) => hrefFor('invPage', p)}
              />
            </>
          )}
        </section>

        {/* Payment receipts */}
        <section className="rounded-lg border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Payment Receipts</h2>
            <span className="text-sm font-semibold text-green-500">{formatZAR(pnl.totalIncome)}</span>
          </div>
          {incomeEntries.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No income records for this division.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeEntries.data.map((e) => (
                    <ClickableTableRow key={e.id} href={`/billing/payments/${e.id}`}>
                      <TableCell>{fmtDate(e.date)}</TableCell>
                      <TableCell>{e.clientName ?? '-'}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-green-500">
                        +{formatZAR(Number(e.amount))}
                      </TableCell>
                    </ClickableTableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={payPage}
                totalPages={Math.ceil(incomeEntries.total / PAGE_SIZE)}
                buildHref={(p) => hrefFor('payPage', p)}
              />
            </>
          )}
        </section>

        {/* Quotes */}
        <section className="rounded-lg border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Quotes</h2>
          </div>
          {quoteEntries.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes for this division.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quoteEntries.data.map((q) => (
                    <ClickableTableRow key={q.id} href={`/billing/quotes/${q.id}`}>
                      <TableCell className="font-medium">{q.documentNumber}</TableCell>
                      <TableCell>{q.expiryDate ? fmtDate(q.expiryDate) : '-'}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatZAR(Number(q.total))}</TableCell>
                    </ClickableTableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={quotePage}
                totalPages={Math.ceil(quoteEntries.total / PAGE_SIZE)}
                buildHref={(p) => hrefFor('quotePage', p)}
              />
            </>
          )}
        </section>

        {/* Expense history */}
        <section className="rounded-lg border p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Expense History</h2>
            <span className="text-sm font-semibold text-amber-500">{formatZAR(expenseEntries.sum)}</span>
          </div>
          {expenseEntries.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expense records for this division.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseEntries.data.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{fmtDate(e.date)}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-amber-500">
                        −{formatZAR(Number(e.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={expPage}
                totalPages={Math.ceil(expenseEntries.total / PAGE_SIZE)}
                buildHref={(p) => hrefFor('expPage', p)}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
