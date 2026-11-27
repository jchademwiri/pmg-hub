import { pgTable, text, timestamp, uuid, date, index, integer, boolean } from 'drizzle-orm/pg-core';
import { clients } from './clients';

export const complianceDocumentTypes = pgTable(
  'compliance_document_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('compliance_document_types_sort_idx').on(t.sortOrder, t.name)],
);

export type ComplianceDocumentType = typeof complianceDocumentTypes.$inferSelect;
export type NewComplianceDocumentType = typeof complianceDocumentTypes.$inferInsert;

export const complianceDocuments = pgTable(
  'compliance_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),

    documentType: text('document_type').notNull(),
    customName: text('custom_name'),

    expiryDate: date('expiry_date').notNull(),

    uploadedBy: text('uploaded_by').notNull(), // 'ADMIN' or 'CLIENT'
    uploadedById: uuid('uploaded_by_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('compliance_documents_client_id_idx').on(t.clientId),
    index('compliance_documents_expiry_date_idx').on(t.expiryDate),
  ],
);
