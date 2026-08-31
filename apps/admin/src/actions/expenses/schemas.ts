import { z } from 'zod';

export const ExpenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  divisionId: z.string().uuid('Division is required'),
  category: z.string().min(1, 'Category is required'),
  clientId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === '' || val === 'none' ? undefined : val)),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().positive('Amount must be positive'),
});

export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const ExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export type ExpenseCategoryInput = z.infer<typeof ExpenseCategorySchema>;
