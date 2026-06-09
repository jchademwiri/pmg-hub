import React from 'react';
import { cn } from '@/lib/utils';
import { fmtDateLong, formatZAR } from '@/lib/format';
import { getDocumentLogoUrl } from '@/lib/document-logo';

interface Allocation {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: string;
  createdAt: Date | string;
}

interface PaymentReceiptPreviewProps {
  id?: string;
  payment: {
    id: string;
    date: string;
    amount: string;
    description: string | null;
    divisionId: string;
    divisionName: string;
    clientId: string | null;
    clientName: string | null;
    allocations?: Allocation[];
  };
  client: {
    name: string;
    businessName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  divSettings?: {
    salesRepName?: string | null;
    salesRepEmail?: string | null;
    salesRepPhone?: string | null;
    divisionWebsite?: string | null;
    logoUrl?: string | null;
  } | null;
}

export function PaymentReceiptPreview({
  id = 'printable-area',
  payment,
  client,
  divSettings,
}: PaymentReceiptPreviewProps) {
  const logoUrl = divSettings?.logoUrl ?? getDocumentLogoUrl(payment.divisionName);
  const receiptNumber = `REC-${payment.id.slice(0, 8).toUpperCase()}`;

  return (
    <div
      id={id}
      className="print-document w-full max-w-[794px] min-h-[1123px] mx-auto flex flex-col bg-white text-zinc-900 shadow-md print:shadow-none ring-1 ring-zinc-200 print:ring-0 border-t-[4px] border-t-emerald-600"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 px-4 sm:px-10 pt-10 pb-6">
        {/* Left: Logo + Company info */}
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 text-xs font-bold overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={payment.divisionName} className="w-full h-full object-contain" />
            ) : (
              payment.divisionName.slice(0, 3).toUpperCase()
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold tracking-tight">{payment.divisionName}</span>
            <span className="text-xs text-zinc-500">Playhouse Media Group</span>
            {divSettings?.salesRepEmail && <span className="text-xs text-zinc-500">{divSettings.salesRepEmail}</span>}
            {divSettings?.salesRepPhone && <span className="text-xs text-zinc-500">{divSettings.salesRepPhone}</span>}
            {divSettings?.divisionWebsite && <span className="text-xs text-zinc-500">{divSettings.divisionWebsite}</span>}
          </div>
        </div>

        {/* Right: Document type + number + status */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-2xl font-bold uppercase tracking-widest text-zinc-300 print:text-zinc-600">
            Receipt
          </span>
          <span className="text-sm font-semibold text-zinc-700">{receiptNumber}</span>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
            Paid
          </span>
        </div>
      </div>

      <div className="mx-4 sm:mx-10 border-t border-zinc-100" />

      {/* ── Meta: Received From + Date (inline, far right) ─────────────────── */}
      <div className="flex items-start justify-between gap-6 px-4 sm:px-10 py-6">
        {/* Paid By */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
            Received From
          </span>
          <span className="text-sm font-semibold">{client.businessName || client.name}</span>
          {client.businessName && client.name !== client.businessName && (
            <span className="text-xs text-zinc-500">{client.name}</span>
          )}
          {client.address && (
            <span className="text-xs text-zinc-500 whitespace-pre-line">{client.address}</span>
          )}
          {client.email && <span className="text-xs text-zinc-500">{client.email}</span>}
          {client.phone && <span className="text-xs text-zinc-500">{client.phone}</span>}
        </div>

        {/* Receipt Date & Total */}
        <div className="flex flex-col gap-3 items-end shrink-0 text-right">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
              Payment Date
            </span>
            <span className="text-sm font-medium">{fmtDateLong(payment.date)}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
              Amount Paid
            </span>
            <span className="text-xl font-bold tabular-nums text-emerald-600">
              {formatZAR(Number(payment.amount))}
            </span>
          </div>
        </div>
      </div>

      {/* Reference Description */}
      {payment.description && (
        <div className="px-4 sm:px-10 pb-6">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
            Payment Reference / Description
          </span>
          <p className="mt-0.5 text-xs text-zinc-600">{payment.description}</p>
        </div>
      )}

      {/* ── Invoice Allocations ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-10 pb-8 flex-grow">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600 block mb-3">
          Invoice Allocations
        </span>

        {!payment.allocations || payment.allocations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500">
            This payment is currently unallocated, or recorded as a general retainer.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-zinc-100 bg-zinc-50">
                <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  Invoice Number
                </th>
                <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  Date Allocated
                </th>
                <th className="py-2 pl-4 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  Amount Allocated
                </th>
              </tr>
            </thead>
            <tbody>
              {payment.allocations.map((alloc) => (
                <tr key={alloc.id} className="border-b border-zinc-100 print:break-inside-avoid">
                  <td className="py-3 pr-4 text-zinc-900 font-medium">{alloc.invoiceNumber}</td>
                  <td className="py-3 px-4 text-zinc-500 text-xs">
                    {fmtDateLong(alloc.createdAt ? new Date(alloc.createdAt) : payment.date)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums font-semibold text-emerald-600">
                    {formatZAR(Number(alloc.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Notes */}
      <div className="mt-auto px-4 sm:px-10 pb-10 pt-4 border-t border-zinc-100 text-center text-[10px] text-zinc-400">
        <p>This is an official payment receipt issued by {payment.divisionName}.</p>
        <p className="mt-0.5">Thank you for your valued business!</p>
      </div>
    </div>
  );
}
