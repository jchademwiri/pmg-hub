import { z } from 'zod';

export const ExpenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  divisionId: z.string().uuid('Division is required'),
  categoryId: z.string().uuid().optional().nullable(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  isTaxDeductible: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
});

export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const ExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export type ExpenseCategoryInput = z.infer<typeof ExpenseCategorySchema>;
