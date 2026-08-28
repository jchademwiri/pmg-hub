import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';

export const publicDocuments = pgTable('public_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // e.g., "sbd-4"
  title: text('title').notNull(), // e.g., "SBD 4 - Declaration of Interest"
  s3Key: text('s3_key').notNull(), // e.g., "sbd/sbd-4.pdf"
  downloadCount: integer('download_count').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PublicDocument = typeof publicDocuments.$inferSelect;
export type NewPublicDocument = typeof publicDocuments.$inferInsert;
