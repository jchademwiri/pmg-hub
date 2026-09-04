import { z } from 'zod';

// ── Line item ─────────────────────────────────────────────────────────────────

export const LineItemSchema = z
  .object({
    itemId: z.preprocess(
      (value) => (value === '' ? null : value),
      z.string().uuid().nullable().optional(),
    ),
    description: z.string().optional().default(''),
    quantity: z.coerce.number().positive('Quantity must be greater than 0'),
    unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
    // vatRate is always 0 - VAT is document-level. Kept for DB compatibility.
    vatRate: z.coerce.number().default(0),
    discountType: z.enum(['percent', 'amount']).optional().nullable(),
    discountValue: z.coerce.number().min(0).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountType === 'percent' &&
      typeof data.discountValue === 'number' &&
      data.discountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Percentage discount cannot exceed 100',
      });
    }
  });

export type LineItemInput = z.infer<typeof LineItemSchema>;

// ── Quotation ─────────────────────────────────────────────────────────────────

export const CreateQuotationSchema = z
  .object({
    divisionId: z.string().uuid('Division is required'),
    // clientId is required - quotes must have a client
    clientId: z.string().uuid('A client is required'),
    quoteDate: z.string().min(1, 'Quote date is required'),
    expiryDate: z.string().optional().nullable(),
    reference: z.string().max(200).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    terms: z.string().max(2000).optional().nullable(),
    lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
    vatEnabled: z.boolean().default(false),
    discountType: z.enum(['percent', 'amount']).optional().nullable(),
    discountValue: z.coerce.number().min(0).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountType === 'percent' &&
      typeof data.discountValue === 'number' &&
      data.discountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Percentage discount cannot exceed 100',
      });
    }
  });

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

// ── Invoice ───────────────────────────────────────────────────────────────────

export const CreateInvoiceSchema = z
  .object({
    divisionId: z.string().uuid('Division is required'),
    // clientId is required - invoices must have a client
    clientId: z.string().uuid('A client is required'),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().optional().nullable(),
    reference: z.string().max(100).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    terms: z.string().max(2000).optional().nullable(),
    lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
    vatEnabled: z.boolean().default(false),
    discountType: z.enum(['percent', 'amount']).optional().nullable(),
    discountValue: z.coerce.number().min(0).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountType === 'percent' &&
      typeof data.discountValue === 'number' &&
      data.discountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Percentage discount cannot exceed 100',
      });
    }
  });

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

// ── Payments ──────────────────────────────────────────────────────────────────

export const RecordPaymentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  divisionId: z.string().min(1).optional().nullable(),
  date: z.string().min(1, 'Payment date is required'),
  amount: z.coerce.number().positive('Payment amount must be positive'),
  method: z.string().min(1, 'Payment method is required'),
  reference: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  sendReceiptEmail: z.boolean().default(false),
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().min(1, 'Invoice is required'),
        amount: z.coerce.number().nonnegative('Allocation amount cannot be negative'),
      }),
    )
    .optional(),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

export const AdjustPaymentSchema = z.object({
  incomeId: z.string().min(1, 'Payment ID is required'),
  newAmount: z.coerce.number().positive('Adjusted amount must be positive'),
});

export type AdjustPaymentInput = z.infer<typeof AdjustPaymentSchema>;

// ── Credit Notes ──────────────────────────────────────────────────────────────

export const CreateCreditNoteSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  divisionId: z.string().min(1, 'Division is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
  creditDate: z.string().min(1, 'Credit date is required'),
  total: z.coerce.number().positive('Total credit must be positive'),
  notes: z.string().max(2000).optional().nullable(),
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
});

export type CreateCreditNoteInput = z.infer<typeof CreateCreditNoteSchema>;

export const ApplyCreditToInvoiceSchema = z.object({
  creditNoteId: z.string().min(1, 'Credit note is required'),
  invoiceId: z.string().min(1, 'Invoice is required'),
  amountToApply: z.coerce.number().positive('Amount to apply must be positive'),
});

export type ApplyCreditToInvoiceInput = z.infer<typeof ApplyCreditToInvoiceSchema>;

export const ApplyCreditToInvoicesSchema = z.object({
  creditNoteId: z.string().min(1, 'Credit note is required'),
  invoices: z
    .array(
      z.object({
        invoiceId: z.string().min(1, 'Invoice is required'),
        amount: z.coerce.number().positive('Allocation amount must be positive'),
      }),
    )
    .min(1, 'At least one invoice is required'),
});

export type ApplyCreditToInvoicesInput = z.infer<typeof ApplyCreditToInvoicesSchema>;
