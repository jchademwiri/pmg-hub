import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Package, CheckCircle, Archive } from 'lucide-react'
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

export const metadata: Metadata = { title: 'Items' }

// Placeholder stats — replace with real data fetching when ready
const stats = [
  { label: 'Total Items', value: '—', icon: Package, description: 'All items' },
  { label: 'Active', value: '—', icon: CheckCircle, description: 'Available for selection' },
  { label: 'Archived', value: '—', icon: Archive, description: 'Hidden from selection' },
]

export default function ItemsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Items</h2>
          <p className="text-sm text-muted-foreground">Manage your service catalogue</p>
        </div>
        <Button asChild size="sm">
          <Link href="/billing/items/new">
            <Plus className="size-4" />
            New Item
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle>All Items</CardTitle>
          <CardDescription>Service items available for invoices and quotes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead>VAT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  <EmptyState
                    message="No items yet. Create your first service item to get started."
                    ctaLabel="New Item"
                    ctaHref="/billing/items/new"
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
