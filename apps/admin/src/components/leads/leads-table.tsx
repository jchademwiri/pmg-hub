'use client'

import Link from 'next/link'
import type { LeadRow } from '@pmg/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface LeadsTableProps {
  entries: LeadRow[]
}

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

export function LeadsTable({ entries }: LeadsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.name ?? ''}</TableCell>
            <TableCell>{entry.email ?? entry.phone ?? ''}</TableCell>
            <TableCell>{entry.divisionName ?? ''}</TableCell>
            <TableCell>{entry.source ?? ''}</TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses[entry.status] ?? 'bg-gray-100 text-gray-800'}`}
              >
                {entry.status}
              </span>
            </TableCell>
            <TableCell>
              <Link
                href={`/leads/${entry.id}`}
                className="text-sm font-medium underline underline-offset-4 hover:text-foreground/80"
              >
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
