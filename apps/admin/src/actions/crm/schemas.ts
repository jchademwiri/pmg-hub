import { z } from 'zod';

export const ClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(200),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
});

export type ClientInput = z.infer<typeof ClientSchema>;

export const LeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  contactName: z.string().min(1, 'Contact name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  status: z.string().default('new'),
  notes: z.string().optional().nullable(),
});

export type LeadInput = z.infer<typeof LeadSchema>;
