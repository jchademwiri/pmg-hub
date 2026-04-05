import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDivisionWithStatsById, getAllIncome, getAllExpenses } from '@pmg/db'
import { formatZAR } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
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
  const [division, incomeEntries, expenseEntries] = await Promise.all([
    getDivisionWithStatsById(id),
    getAllIncome({ divisionId: id }),
    getAllExpenses({ divisionId: id }),
  ])
  if (!division) notFound()

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/divisions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Divisions
        </Link>
        <h1 className="text-2xl font-semibold">{division.name}</h1>
        <Badge variant={division.isActive ? 'default' : 'secondary'}>
          {division.isActive ? 'Active' : 'Disabled'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: formatZAR(division.totalIncome) },
          { label: 'Total Expenses', value: formatZAR(division.totalExpenses) },
          { label: 'Net Profit', value: formatZAR(division.netProfit), colored: true, positive: division.netProfit >= 0 },
          { label: 'Leads', value: String(division.leadCount) },
        ].map(({ label, value, colored, positive }) => (
          <div key={label} className="rounded-lg border p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={`text-lg font-semibold tabular-nums ${colored ? (positive ? 'text-green-500' : 'text-red-500') : ''}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Income history */}
      <section className="rounded-lg border p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Income History</h2>
          <span className="text-sm font-semibold text-muted-foreground">
            {formatZAR(division.totalIncome)}
          </span>
        </div>
        {incomeEntries.length === 0 ? (
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
              {incomeEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.clientName ?? '—'}</TableCell>
                  <TableCell>{e.description ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatZAR(Number(e.amount))}</TableCell>
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
          <span className="text-sm font-semibold text-muted-foreground">
            {formatZAR(division.totalExpenses)}
          </span>
        </div>
        {expenseEntries.length === 0 ? (
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
              {expenseEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatZAR(Number(e.amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
