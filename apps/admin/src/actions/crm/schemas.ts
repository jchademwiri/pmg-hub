import { z } from 'zod';

export const ClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(200),
  businessName: z.string().max(200).optional().nullable(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  phone: z.string().max(50).optional().nullable(),
  divisionId: z.string().uuid().optional().nullable(),
  registrationNumber: z.string().max(100).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  billingAddress: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  isRetainer: z.boolean().default(false),
  excludeFromAutoStatements: z.boolean().default(false),
});

export type ClientInput = z.infer<typeof ClientSchema>;

export const LeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost'], {
    error: 'Status must be one of: new, contacted, converted, or lost',
  }),
});

export type LeadStatusInput = z.infer<typeof LeadStatusSchema>;

export const LeadNotesSchema = z.object({
  notes: z.string().optional().nullable(),
});

export type LeadNotesInput = z.infer<typeof LeadNotesSchema>;

export const CreateLeadSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    companyName: z.string().max(200).optional().nullable(),
    email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
    phone: z.string().max(50).optional().nullable(),
    source: z.string().max(100).optional().nullable(),
    serviceInterest: z.string().max(200).optional().nullable(),
    divisionId: z.string().uuid().optional().nullable(),
    message: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => !!(data.email || data.phone), {
    message: 'At least one of email or phone is required',
  });

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
