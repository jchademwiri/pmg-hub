import type { Metadata } from 'next'
import { getAllSnapshots } from '@pmg/db'
import { formatZAR } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Snapshots' }

export default async function SnapshotsPage() {
  const snapshots = await getAllSnapshots()

  return (
    <div className="flex flex-col gap-6">
      {snapshots.length === 0 ? (
        <EmptyState message="No months have been closed yet. Use the Close Month button on the dashboard to lock a month's figures." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>PMG Share</TableHead>
              <TableHead>Profit Pool</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Reinvest</TableHead>
              <TableHead>Reserve</TableHead>
              <TableHead>Flex</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {new Date(row.period + '-01').toLocaleString('en-ZA', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-green-500 tabular-nums font-medium">{formatZAR(Number(row.revenue))}</TableCell>
                <TableCell className="text-amber-500 tabular-nums font-medium">{formatZAR(Number(row.expenses))}</TableCell>
                <TableCell className="text-green-500 tabular-nums font-medium">{formatZAR(Number(row.pmgShare))}</TableCell>
                <TableCell className={`tabular-nums font-medium ${Number(row.profitPool) < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatZAR(Number(row.profitPool))}</TableCell>
                <TableCell className="text-green-500 tabular-nums font-medium">{formatZAR(Number(row.salary))}</TableCell>
                <TableCell className="text-green-500 tabular-nums font-medium">{formatZAR(Number(row.reinvest))}</TableCell>
                <TableCell className="text-green-500 tabular-nums font-medium">{formatZAR(Number(row.reserve))}</TableCell>
                <TableCell className="text-green-500 tabular-nums font-medium">{formatZAR(Number(row.flex))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

