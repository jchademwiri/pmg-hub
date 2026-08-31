import { z } from 'zod';

export const JournalLineSchema = z.object({
  accountId: z.string().uuid('Account is required'),
  description: z.string().optional(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});

export const JournalEntrySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional().nullable(),
  lines: z.array(JournalLineSchema).min(2, 'At least 2 journal lines are required'),
});

export type JournalEntryInput = z.infer<typeof JournalEntrySchema>;
