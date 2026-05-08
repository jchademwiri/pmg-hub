import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LineItem {
  description: string
  qty: number
  unitPrice: number
  vatApplicable: boolean
}

export interface DocumentOrg {
  name: string
  divisionOf?: string
  registrationNumber?: string
  vatNumber?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  salesRep?: string
}

export interface DocumentBanking {
  bankName: string
  accountName: string
  accountNumber: string
  branchCode: string
}

export interface DocumentClient {
  name: string
  email?: string
  phone?: string
  address?: string
}

export interface DocumentPreviewProps {
  type: 'invoice' | 'quote' | 'statement'
  number: string
  status: string
  issueDate: string
  /** Due date (invoice) or expiry date (quote) */
  dueDate?: string
  /** Statement period */
  periodFrom?: string
  periodTo?: string
  reference?: string
  org: DocumentOrg
  client: DocumentClient
  lineItems?: LineItem[]
  /** Statement transactions */
  transactions?: StatementTransaction[]
  notes?: string
  terms?: string
  banking?: DocumentBanking
  vatRate?: number
  /** Optional link shown on the sticky header — useful during development */
  href?: string
}

export interface StatementTransaction {
  date: string
  reference: string
  description: string
  debit?: number
  credit?: number
  balance: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Draft:    'bg-muted text-muted-foreground',
    Sent:     'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    Paid:     'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    Overdue:  'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    Accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    Declined: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    Expired:  'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', map[status] ?? map['Draft'])}>
      {status}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentPreview({
  type,
  number,
  status,
  issueDate,
  dueDate,
  periodFrom,
  periodTo,
  reference,
  org,
  client,
  lineItems = [],
  transactions = [],
  notes,
  terms,
  banking,
  vatRate = 15,
  href,
}: DocumentPreviewProps) {
  // Totals
  const subtotal = lineItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
  const vat = lineItems.reduce(
    (sum, i) => sum + (i.vatApplicable ? i.qty * i.unitPrice * (vatRate / 100) : 0),
    0,
  )
  const total = subtotal + vat

  const typeLabel =
    type === 'invoice' ? 'Invoice' : type === 'quote' ? 'Quotation' : 'Statement'

  const dueDateLabel =
    type === 'invoice' ? 'Due Date' : type === 'quote' ? 'Expiry Date' : undefined

  return (
    // Paper shell — white background, constrained width, subtle shadow
    <div className="w-full rounded-xl bg-white text-zinc-900 shadow-md ring-1 ring-zinc-200 dark:bg-zinc-50 dark:text-zinc-900 dark:ring-zinc-300 print:shadow-none print:ring-0">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 px-10 pt-10 pb-6">
        {/* Company block */}
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold tracking-tight">{org.name}</span>
          {org.registrationNumber && (
            <span className="text-xs text-zinc-500">Reg: {org.registrationNumber}</span>
          )}
          {org.vatNumber && (
            <span className="text-xs text-zinc-500">VAT: {org.vatNumber}</span>
          )}
          {org.address && (
            <span className="mt-1 text-xs text-zinc-500 whitespace-pre-line">{org.address}</span>
          )}
          {org.email && <span className="text-xs text-zinc-500">{org.email}</span>}
          {org.phone && <span className="text-xs text-zinc-500">{org.phone}</span>}
          {org.website && <span className="text-xs text-zinc-500">{org.website}</span>}
          {org.salesRep && (
            <span className="mt-1 text-xs text-zinc-500">Rep: {org.salesRep}</span>
          )}
        </div>

        {/* Document type + number + status — sticky as you scroll */}
        <div className="sticky top-4 flex flex-col items-end gap-2">
          <span className="text-2xl font-bold uppercase tracking-widest text-zinc-300">
            {typeLabel}
          </span>
          <span className="text-sm font-semibold text-zinc-700">#{number}</span>
          <StatusPill status={status} />
          {href && (
            <Link
              href={href}
              className="mt-1 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              Open page
            </Link>
          )}
        </div>
      </div>

      <div className="mx-10 border-t border-zinc-100" />

      {/* ── Meta grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 px-10 py-6 sm:grid-cols-4">
        {/* Bill To */}
        <div className="col-span-2 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {type === 'statement' ? 'Account' : 'Bill To'}
          </span>
          <span className="text-sm font-semibold">{client.name}</span>
          {client.address && (
            <span className="text-xs text-zinc-500 whitespace-pre-line">{client.address}</span>
          )}
          {client.email && <span className="text-xs text-zinc-500">{client.email}</span>}
          {client.phone && <span className="text-xs text-zinc-500">{client.phone}</span>}
        </div>

        {/* Dates / period */}
        {type === 'statement' ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Period From</span>
              <span className="text-sm font-medium">{periodFrom ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Period To</span>
              <span className="text-sm font-medium">{periodTo ?? '—'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Issue Date</span>
              <span className="text-sm font-medium">{issueDate}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                {dueDateLabel}
              </span>
              <span className="text-sm font-medium">{dueDate ?? '—'}</span>
            </div>
          </>
        )}
      </div>

      {reference && (
        <div className="px-10 pb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Reference</span>
          <p className="mt-0.5 text-xs text-zinc-600">{reference}</p>
        </div>
      )}

      {/* ── Line items (invoice / quote) ────────────────────────────────────── */}
      {type !== 'statement' && (
        <div className="px-10 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-zinc-100 bg-zinc-50">
                <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Description
                </th>
                <th className="py-2.5 px-4 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Qty
                </th>
                <th className="py-2.5 px-4 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Unit Price
                </th>
                <th className="py-2.5 pl-4 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className="border-b border-zinc-50">
                  <td className="py-3 pr-4 text-zinc-800">{item.description}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-600">{item.qty}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-zinc-600">{fmt(item.unitPrice)}</td>
                  <td className="py-3 pl-4 text-right tabular-nums font-medium">{fmt(item.qty * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="flex w-64 flex-col gap-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>VAT ({vatRate}%)</span>
                <span className="tabular-nums">{fmt(vat)}</span>
              </div>
              <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-zinc-900">
                <span>Total</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Statement transactions ──────────────────────────────────────────── */}
      {type === 'statement' && transactions.length > 0 && (
        <div className="px-10 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-zinc-100 bg-zinc-50">
                {['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'py-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400',
                      ['Debit', 'Credit', 'Balance'].includes(h) ? 'text-right' : 'text-left',
                      h === 'Date' ? 'pr-4' : 'px-4',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={i} className="border-b border-zinc-50">
                  <td className="py-2.5 pr-4 text-xs text-zinc-600 whitespace-nowrap">{tx.date}</td>
                  <td className="py-2.5 px-4 text-xs text-zinc-600 whitespace-nowrap">{tx.reference}</td>
                  <td className="py-2.5 px-4 text-xs text-zinc-800">{tx.description}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-xs text-zinc-600">
                    {tx.debit != null ? fmt(tx.debit) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-xs text-zinc-600">
                    {tx.credit != null ? fmt(tx.credit) : '—'}
                  </td>
                  <td className={cn(
                    'py-2.5 pl-4 text-right tabular-nums text-xs font-medium',
                    tx.balance < 0 ? 'text-red-600' : 'text-zinc-900',
                  )}>
                    {fmt(Math.abs(tx.balance))}{tx.balance < 0 ? ' CR' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Statement summary */}
          <div className="mt-4 flex justify-end">
            <div className="flex w-64 flex-col gap-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Total Invoiced</span>
                <span className="tabular-nums">
                  {fmt(transactions.reduce((s, t) => s + (t.debit ?? 0), 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Total Paid</span>
                <span className="tabular-nums">
                  {fmt(transactions.reduce((s, t) => s + (t.credit ?? 0), 0))}
                </span>
              </div>
              <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-zinc-900">
                <span>Balance Due</span>
                <span className="tabular-nums">
                  {fmt(transactions[transactions.length - 1]?.balance ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes / Terms ───────────────────────────────────────────────────── */}
      {(notes || terms) && (
        <div className="mx-10 border-t border-zinc-100 pt-5 pb-6 flex flex-col gap-3">
          {notes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Notes</p>
              <p className="mt-1 text-xs text-zinc-600 whitespace-pre-line">{notes}</p>
            </div>
          )}
          {terms && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Terms & Conditions</p>
              <p className="mt-1 text-xs text-zinc-600 whitespace-pre-line">{terms}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Banking details ─────────────────────────────────────────────────── */}
      {banking && (
        <div className="mx-10 border-t border-zinc-100 pt-5 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            Banking Details
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-4">
            {[
              { label: 'Bank', value: banking.bankName },
              { label: 'Account Name', value: banking.accountName },
              { label: 'Account Number', value: banking.accountNumber },
              { label: 'Branch Code', value: banking.branchCode },
            ].map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-400">{f.label}</span>
                <span className="text-xs font-medium text-zinc-700">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="mx-10 border-t border-zinc-100 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-400">{org.name}</span>
          {org.divisionOf && (
            <span className="text-[10px] text-zinc-400">A division of {org.divisionOf}</span>
          )}
        </div>
        <span className="text-[10px] text-zinc-400">
          {org.email ?? ''}{org.phone ? ` · ${org.phone}` : ''}
        </span>
        <span className="text-[10px] text-zinc-400">Thank you for your business.</span>
      </div>
    </div>
  )
}
