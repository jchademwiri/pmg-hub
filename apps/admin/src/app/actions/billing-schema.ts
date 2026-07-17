import { z } from 'zod';

// ── Line item ─────────────────────────────────────────────────────────────────

export const LineItemSchema = z.object({
  itemId: z.preprocess(
    (value) => value === '' ? null : value,
    z.string().uuid().nullable().optional(),
  ),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  // vatRate is always 0 - VAT is document-level. Kept for DB compatibility.
  vatRate: z.coerce.number().default(0),
  discountType: z.enum(['percent', 'amount']).optional().nullable(),
  discountValue: z.coerce.number().min(0).optional().nullable(),
});

export type LineItemInput = z.infer<typeof LineItemSchema>;

// ── Quotation ─────────────────────────────────────────────────────────────────

export const CreateQuotationSchema = z.object({
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
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

// ── Invoice ───────────────────────────────────────────────────────────────────

export const CreateInvoiceSchema = z.object({
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
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
