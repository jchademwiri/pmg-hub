import React from 'react';
import { fmtDateLong, formatZAR } from '@/lib/format';
import { BillingStatusBadge } from './billing-status-badge';
import type { DocumentPreviewProps } from './document-preview';

export function MobileReceiptPreview({
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
  lineItems,
  subtotal = 0,
  discountTotal = 0,
  vatTotal = 0,
  grandTotal = 0,
  notes,
  terms,
  banking,
  className,
}: DocumentPreviewProps & { className?: string }) {
  const isQuote = type === 'quote';

  return (
    <div className={`w-full max-w-sm mx-auto bg-card border border-border shadow-sm rounded-xl overflow-hidden ${className}`}>
      {/* Header section */}
      <div className="bg-muted/30 p-6 flex flex-col items-center justify-center text-center border-b border-border border-dashed">
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logoUrl} alt={org.name} className="h-12 object-contain mb-4" />
        ) : (
          <div className="h-12 mb-4 flex items-center justify-center">
            <span className="font-bold text-xl">{org.name}</span>
          </div>
        )}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">
          {type === 'invoice' ? 'Tax Invoice' : type === 'quote' ? 'Quotation' : 'Statement'}
        </h2>
        <div className="text-2xl font-bold mb-3">{formatZAR(grandTotal)}</div>
        <BillingStatusBadge status={status} />
      </div>

      {/* Details section */}
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Date</p>
            <p className="font-medium">{fmtDateLong(issueDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
              {isQuote ? 'Expiry' : 'Due Date'}
            </p>
            <p className="font-medium">{dueDate ? fmtDateLong(dueDate) : 'On Receipt'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Doc #</p>
            <p className="font-medium">{number}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Billed To</p>
            <p className="font-medium truncate" title={client.name}>{client.name}</p>
          </div>
        </div>

        {/* Line Items */}
        {lineItems && lineItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Line Items</p>
            <div className="flex flex-col gap-3">
              {lineItems.map((item, idx) => {
                const total = item.qty * item.unitPrice - (item.discountAmount ?? 0);
                return (
                  <div key={idx} className="flex justify-between items-start gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{item.itemName || item.description}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.qty} x {formatZAR(item.unitPrice)}
                      </span>
                    </div>
                    <span className="font-medium tabular-nums">{formatZAR(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="flex flex-col gap-2 pt-4 border-t border-border border-dashed text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatZAR(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="tabular-nums">-{formatZAR(discountTotal)}</span>
            </div>
          )}
          {vatTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (15%)</span>
              <span className="tabular-nums">{formatZAR(vatTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-border mt-1">
            <span>Total</span>
            <span className="tabular-nums">{formatZAR(grandTotal)}</span>
          </div>
        </div>

        {/* Banking Details */}
        {banking && type === 'invoice' && (
          <div className="bg-muted/30 rounded-lg p-4 flex flex-col gap-1 text-xs">
            <p className="font-semibold mb-1">Payment Details</p>
            <p><span className="text-muted-foreground">Bank:</span> {banking.bankName}</p>
            <p><span className="text-muted-foreground">Acc Name:</span> {banking.accountName}</p>
            <p><span className="text-muted-foreground">Acc Number:</span> {banking.accountNumber}</p>
            <p><span className="text-muted-foreground">Branch:</span> {banking.branchCode}</p>
            <p className="mt-1 font-medium text-primary">Use {number} as reference</p>
          </div>
        )}
      </div>
    </div>
  );
}
