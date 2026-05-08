import { z } from 'zod';

// ── Line item ─────────────────────────────────────────────────────────────────

export const LineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  vatRate: z.coerce.number().refine((v) => v === 0 || v === 15, {
    message: 'VAT rate must be 0 or 15',
  }),
});

export type LineItemInput = z.infer<typeof LineItemSchema>;

// ── Quotation ─────────────────────────────────────────────────────────────────

export const CreateQuotationSchema = z.object({
  divisionId: z.string().uuid('Division is required'),
  clientId: z.string().uuid().optional().nullable(),
  quoteDate: z.string().min(1, 'Quote date is required'),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

// ── Invoice ───────────────────────────────────────────────────────────────────

export const CreateInvoiceSchema = z.object({
  divisionId: z.string().uuid('Division is required'),
  clientId: z.string().uuid().optional().nullable(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().optional().nullable(),
  poNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
