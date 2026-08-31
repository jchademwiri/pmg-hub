import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { divisions } from './divisions';
import { leads } from './leads';
import { clients } from './clients';
import { user } from './auth';

export const onboardingStatusEnum = pgEnum('onboarding_status', [
  'pending',
  'converted',
  'rejected',
  'archived',
]);

export const clientOnboardings = pgTable(
  'client_onboardings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    divisionId: uuid('division_id').references(() => divisions.id, {
      onDelete: 'set null',
    }),
    leadId: uuid('lead_id').references(() => leads.id, {
      onDelete: 'set null',
    }),

    // Core Client Profile Essentials
    contactName: text('contact_name').notNull(),
    companyName: text('company_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),

    // Optional Fields
    registrationNumber: text('registration_number'),
    notes: text('notes'),

    // Status & Admin Workflow Tracking
    status: onboardingStatusEnum('status').notNull().default('pending'),
    convertedClientId: uuid('converted_client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    reviewedBy: text('reviewed_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    index('onboarding_status_idx').on(t.status),
    index('onboarding_lead_id_idx').on(t.leadId),
    index('onboarding_created_at_idx').on(t.createdAt),
    index('onboarding_email_idx').on(t.email),
  ],
);

export type ClientOnboarding = typeof clientOnboardings.$inferSelect;
export type NewClientOnboarding = typeof clientOnboardings.$inferInsert;

export const clientOnboardingsRelations = relations(clientOnboardings, ({ one }) => ({
  division: one(divisions, {
    fields: [clientOnboardings.divisionId],
    references: [divisions.id],
  }),
  lead: one(leads, {
    fields: [clientOnboardings.leadId],
    references: [leads.id],
  }),
  convertedClient: one(clients, {
    fields: [clientOnboardings.convertedClientId],
    references: [clients.id],
  }),
  reviewer: one(user, {
    fields: [clientOnboardings.reviewedBy],
    references: [user.id],
  }),
}));
