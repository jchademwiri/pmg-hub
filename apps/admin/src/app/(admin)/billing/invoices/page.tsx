import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Invoices' }

// Placeholder stats — replace with real data fetching when ready
const stats = [
  { label: 'Total Invoices', value: '—', icon: FileText, description: 'All time' },
  { label: 'Pending', value: '—', icon: Clock, description: 'Awaiting payment' },
  { label: 'Paid', value: '—', icon: CheckCircle, description: 'This month' },
  { label: 'Overdue', value: '—', icon: AlertCircle, description: 'Past due date' },
]

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">Manage and track client invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {/* TODO: remove — dev preview link */}
          <Link
            href="/billing/invoices/mock-preview"
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            Preview mock invoice →
          </Link>
          <Button asChild size="sm">
            <Link href="/billing/invoices/new">
              <Plus className="size-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invoices table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices across clients</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="py-0">
                  <EmptyState
                    message="No invoices yet. Create your first invoice to get started."
                    ctaLabel="New Invoice"
                    ctaHref="/billing/invoices/new"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
