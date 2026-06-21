import Link from 'next/link'
// Trigger Next.js cache reload
import { cn } from '@/lib/utils'
import { fmtDateLong, formatZAR } from '@/lib/format'
import { getDocumentLogoUrl } from '@/lib/document-logo'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LineItem {
  itemName?: string | null
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
  logoUrl?: string
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
  id?: string
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
  /** Pre-computed discount amount (positive number). If provided, shown as a deduction in the totals block. */
  discountAmount?: number
  /** Optional link shown on the sticky header - useful during development */
  href?: string
  /** Statement ageing buckets */
  ageing?: {
    current: number;
    days1_14: number;
    days15_30: number;
    days31_60: number;
    days61_90: number;
    days91_120: number;
  }
  /** Global balance due for statement */
  balanceDue?: number
  /** Balance brought forward for statement period */
  openingBalance?: number
}

export interface StatementTransaction {
  date: string
  reference: string
  description: string
  debit?: number
  credit?: number
  balance?: number
  invoiceId?: string
  paymentId?: string
  creditNoteId?: string
  refundId?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return formatZAR(amount)
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Draft:    'bg-zinc-100 text-zinc-500',
    Sent:     'bg-blue-50 text-blue-700',
    Paid:     'bg-emerald-50 text-emerald-700',
    Overdue:  'bg-red-50 text-red-700',
    Accepted: 'bg-emerald-50 text-emerald-700',
    Declined: 'bg-red-50 text-red-700',
    Expired:  'bg-orange-50 text-orange-700',
    Issued:   'bg-blue-50 text-blue-700',
    Void:     'bg-zinc-100 text-zinc-500',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', map[status] ?? map['Draft'])}>
      {status}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentPreview({
  id,
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
  discountAmount = 0,
  href,
  ageing,
  balanceDue,
  openingBalance,
}: DocumentPreviewProps) {
  // Totals - discount is applied after subtotal, before VAT
  const subtotal = lineItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
  const vatBase = subtotal - discountAmount
  const vat = lineItems.reduce(
    (sum, i) => sum + (i.vatApplicable ? i.qty * i.unitPrice * (vatRate / 100) : 0),
    0,
  )
  const total = vatBase + vat

  const typeLabel =
    type === 'invoice' ? 'Invoice' : type === 'quote' ? 'Quotation' : 'Statement'

  const dueDateLabel =
    type === 'invoice' ? 'Due Date' : type === 'quote' ? 'Expiry Date' : undefined

  const logoUrl = org.logoUrl ?? getDocumentLogoUrl(org.name)

  return (
    <div id={id} className="print-document w-full max-w-[794px] min-h-[1123px] mx-auto flex flex-col bg-white text-zinc-900 shadow-md print:shadow-none ring-1 ring-zinc-200 print:ring-0 border-t-[4px] border-t-blue-700">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-6 px-4 sm:px-10 pt-10 pb-6">

        {/* Left: Company info */}
        <div className="flex max-w-[16rem] items-start gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold tracking-tight">{org.name}</span>
            {org.registrationNumber && (
              <span className="text-xs text-zinc-500">Reg: {org.registrationNumber}</span>
            )}
            {org.vatNumber && (
              <span className="text-xs text-zinc-500">VAT: {org.vatNumber}</span>
            )}
            {org.address && (
              <span className="mt-0.5 text-xs text-zinc-500 whitespace-pre-line">{org.address}</span>
            )}
            {org.email && <span className="text-xs text-zinc-500">{org.email}</span>}
            {org.phone && <span className="text-xs text-zinc-500">{org.phone}</span>}
            {org.website && <span className="text-xs text-zinc-500">{org.website}</span>}
            {org.salesRep && (
              <span className="text-xs text-zinc-500">Rep: {org.salesRep}</span>
            )}
          </div>
        </div>

        {/* Center: Logo */}
        <div className="flex h-16 w-40 items-center justify-center overflow-hidden bg-transparent">
          {logoUrl ? (
            <img src={logoUrl} alt={org.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-zinc-800">{org.name.slice(0, 3).toUpperCase()}</span>
          )}
        </div>

        {/* Right: Document type + number + status + amount due */}
        <div className="flex flex-col items-end gap-2 justify-self-end">
          <span className="text-2xl font-bold uppercase tracking-widest text-zinc-300 print:text-zinc-600">
            {typeLabel}
          </span>
          <span className="text-sm font-semibold text-zinc-700">#{number}</span>
          <StatusPill status={status} />
          {balanceDue !== undefined && type === 'statement' && (
            <div className="mt-2 text-right">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600 block mb-0.5">Amount Due</span>
              <span className={cn('text-lg font-bold tabular-nums', balanceDue <= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {fmt(Math.abs(balanceDue))}{balanceDue < 0 ? ' CR' : ''}
              </span>
            </div>
          )}
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

      <div className="mx-4 sm:mx-10 border-t border-zinc-100" />

      {/* ── Meta: Bill To + Dates (inline, far right) ──────────────────────── */}
      <div className="flex items-start justify-between gap-6 px-4 sm:px-10 py-6">

        {/* Bill To */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
            {type === 'statement' ? 'Account' : 'Bill To'}
          </span>
          <span className="text-sm font-semibold">{client.name}</span>
          {client.address && (
            <span className="text-xs text-zinc-500 whitespace-pre-line">{client.address}</span>
          )}
          {client.email && <span className="text-xs text-zinc-500">{client.email}</span>}
          {client.phone && <span className="text-xs text-zinc-500">{client.phone}</span>}
        </div>

        {/* Dates - inline, far right */}
        {type === 'statement' ? (
          <div className="flex gap-8 shrink-0">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">Period From</span>
              <span className="text-sm font-medium">{fmtDateLong(periodFrom)}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">Period To</span>
              <span className="text-sm font-medium">{fmtDateLong(periodTo)}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 items-end shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">Issue Date</span>
              <span className="text-sm font-medium">{fmtDateLong(issueDate)}</span>
            </div>
            {dueDateLabel && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">{dueDateLabel}</span>
                <span className="text-sm font-medium">{fmtDateLong(dueDate)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {reference && (
        <div className="px-4 sm:px-10 pb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">Reference</span>
          <p className="mt-0.5 text-xs text-zinc-600">{reference}</p>
        </div>
      )}

      {/* ── Line items (invoice / quote) ────────────────────────────────────── */}
      {type !== 'statement' && (
        <div className="px-4 sm:px-10 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-zinc-100 bg-zinc-50">
                <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  Description
                </th>
                <th className="py-2.5 px-4 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  Qty
                </th>
                <th className="py-2.5 px-4 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  Unit Price
                </th>
                <th className="py-2.5 pl-4 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => {
                const primaryText = item.itemName || item.description;
                const hasSecondary = !!item.itemName && !!item.description && item.description.trim().toLowerCase() !== item.itemName.trim().toLowerCase();
                return (
                  <tr key={i} className="border-b border-zinc-100 print:break-inside-avoid">
                    <td className="py-3 pr-4 text-zinc-800">
                      <div className="text-zinc-900">{primaryText}</div>
                      {hasSecondary && (
                        <div className="mt-0.5 text-[11px] text-zinc-500 italic">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-zinc-600">{item.qty}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-zinc-600">{fmt(item.unitPrice)}</td>
                    <td className="py-3 pl-4 text-right tabular-nums font-medium">{fmt(item.qty * item.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="flex w-64 flex-col gap-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Discount</span>
                  <span className="tabular-nums">−{fmt(discountAmount)}</span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>VAT ({vatRate}%)</span>
                  <span className="tabular-nums">{fmt(vat)}</span>
                </div>
              )}
              <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-zinc-900">
                <span>Total</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Statement transactions ──────────────────────────────────────────── */}
      {type === 'statement' && (
        <div className="px-4 sm:px-10 pb-6">
          {transactions.length === 0 && openingBalance === undefined ? (
            <div className="py-12 border border-dashed border-zinc-200 rounded-lg text-center">
              <p className="text-sm text-zinc-500">No transactions for this period.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-100 bg-zinc-50">
                  {['Date', 'Invoice No.', 'Description', 'Debit', 'Credit', 'Balance'].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        'py-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600',
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
                {/* Balance Brought Forward row (at the top with colSpan spanning Invoice No. and Description) */}
                {openingBalance !== undefined && (
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <td className="py-2.5 pr-4 text-xs text-zinc-500 whitespace-nowrap">{fmtDateLong(periodFrom)}</td>
                    <td colSpan={2} className="py-2.5 px-4 text-xs text-zinc-500 italic font-normal">
                      Balance Brought Forward
                    </td>
                    <td className="py-2.5 px-4 text-right text-xs text-zinc-500">—</td>
                    <td className="py-2.5 px-4 text-right text-xs text-zinc-500">—</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-xs font-semibold text-zinc-500">
                      {fmt(openingBalance)}
                    </td>
                  </tr>
                )}
                {transactions.map((tx, i) => (
                  <tr key={i} className="border-b border-zinc-50">
                    <td className="py-2.5 pr-4 text-xs text-zinc-600 whitespace-nowrap">{fmtDateLong(tx.date)}</td>
                    <td className="py-2.5 px-4 text-xs text-zinc-600 whitespace-nowrap">
                      {tx.invoiceId ? (
                        <Link
                          href={`/billing/invoices/${tx.invoiceId}`}
                          className="text-blue-700 hover:underline print:text-zinc-600 print:no-underline font-medium"
                        >
                          {tx.reference}
                        </Link>
                      ) : tx.paymentId ? (
                        <Link
                          href={`/billing/payments/${tx.paymentId}`}
                          className="text-blue-700 hover:underline print:text-zinc-600 print:no-underline font-medium"
                        >
                          {tx.reference}
                        </Link>
                      ) : (
                        tx.reference
                      )}
                    </td>
                    <td className={cn('py-2.5 px-4 text-xs', tx.credit != null ? 'text-emerald-600 font-medium' : 'text-zinc-800')}>
                      {tx.description}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-xs text-zinc-600">
                      {tx.debit != null ? fmt(tx.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-xs font-medium text-emerald-600">
                      {tx.credit != null ? fmt(tx.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-xs font-semibold text-zinc-800">
                      {tx.balance != null ? fmt(tx.balance) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Statement summary */}
          <div className="mt-4 flex justify-end">
            <div className="flex w-64 flex-col gap-2">
              {(() => {
                const totalInvoiced = transactions.reduce((s, t) => s + (t.debit ?? 0), 0)
                const totalPaid = transactions.reduce((s, t) => s + (t.credit ?? 0), 0)
                const balanceDueCalc = balanceDue !== undefined ? balanceDue : ((openingBalance ?? 0) + totalInvoiced - totalPaid)
                return (
                  <>
                    {openingBalance !== undefined && (
                      <div className="flex justify-between text-sm text-zinc-600">
                        <span>Balance Brought Forward</span>
                        <span className="tabular-nums">{fmt(openingBalance)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-zinc-600">
                      <span>Total Invoiced (Period)</span>
                      <span className="tabular-nums">{fmt(totalInvoiced)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Total Paid (Period)</span>
                      <span className="tabular-nums">{fmt(totalPaid)}</span>
                    </div>
                    <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold">
                      <span className="text-zinc-900">Amount Due</span>
                      <span className={cn('tabular-nums', balanceDueCalc <= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {fmt(Math.abs(balanceDueCalc))}{balanceDueCalc < 0 ? ' CR' : ''}
                      </span>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}


      {/* ── Banking details - after line items ──────────────────────────────── */}
      {banking && (
        <div className="mx-4 sm:mx-10 border-t border-zinc-100 pt-5 pb-4 print:break-inside-avoid">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600 mb-3">
            Banking Details
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Bank', value: banking.bankName },
              { label: 'Account Name', value: banking.accountName },
              { label: 'Account Number', value: banking.accountNumber },
              { label: 'Branch Code', value: banking.branchCode },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-32 shrink-0">{f.label}:</span>
                <span className="text-xs font-semibold text-zinc-700">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Spacer - pushes notes + footer to the bottom of the page ────────── */}
      <div className="flex-1" />

      {/* ── Statement Ageing - pinned to bottom ─────────────────────────────── */}
      {type === 'statement' && ageing && (
        <div className="mx-4 sm:mx-10 border-t border-zinc-100 pt-5 pb-4 print:break-inside-avoid">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600 mb-3">
            Ageing Summary
          </p>
          <table className="w-full text-xs text-center border border-zinc-200">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="py-2 font-medium text-zinc-500 uppercase tracking-wide">91+ Days</th>
                <th className="py-2 font-medium text-zinc-500 uppercase tracking-wide border-l border-zinc-200">61–90 Days</th>
                <th className="py-2 font-medium text-zinc-500 uppercase tracking-wide border-l border-zinc-200">31–60 Days</th>
                <th className="py-2 font-medium text-zinc-500 uppercase tracking-wide border-l border-zinc-200">15–30 Days</th>
                <th className="py-2 font-medium text-zinc-500 uppercase tracking-wide border-l border-zinc-200">1–14 Days</th>
                <th className="py-2 font-medium text-zinc-500 uppercase tracking-wide border-l border-zinc-200">Current</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cn('py-3 tabular-nums font-semibold', ageing.days91_120 > 0 ? 'text-red-700' : '')}>{fmt(ageing.days91_120)}</td>
                <td className={cn('py-3 tabular-nums font-semibold border-l border-zinc-200', ageing.days61_90 > 0 ? 'text-red-600' : '')}>{fmt(ageing.days61_90)}</td>
                <td className={cn('py-3 tabular-nums font-semibold border-l border-zinc-200', ageing.days31_60 > 0 ? 'text-red-500' : '')}>{fmt(ageing.days31_60)}</td>
                <td className={cn('py-3 tabular-nums font-semibold border-l border-zinc-200', ageing.days15_30 > 0 ? 'text-orange-600' : '')}>{fmt(ageing.days15_30)}</td>
                <td className={cn('py-3 tabular-nums font-semibold border-l border-zinc-200', ageing.days1_14 > 0 ? 'text-amber-600' : '')}>{fmt(ageing.days1_14)}</td>
                <td className="py-3 tabular-nums font-semibold border-l border-zinc-200">{fmt(ageing.current)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Notes / Terms - fixed just above footer ─────────────────────────── */}
      {(notes || terms) && (
        <div className="mx-4 sm:mx-10 border-t border-zinc-100 pt-4 pb-4 flex flex-col gap-3 print:break-inside-avoid">
          {notes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">Notes</p>
              <p className="mt-1 text-xs text-zinc-600 whitespace-pre-line">{notes}</p>
            </div>
          )}
          {terms && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">Terms & Conditions</p>
              <p className="mt-1 text-xs text-zinc-600 whitespace-pre-line">{terms}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Footer - pinned to bottom ───────────────────────────────────── */}
      <div className="mx-4 sm:mx-10 border-t border-zinc-100 py-4 flex items-center justify-between">
        <span className="text-[10px] text-zinc-400">
          {org.divisionOf ? `A division of ${org.divisionOf}` : ''}
        </span>
        <span className="text-[10px] text-zinc-400">Thank you for your business.</span>
      </div>
    </div>
  )
}
