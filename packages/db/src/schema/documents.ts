import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import type { PublicDocumentCategory } from '@pmg/utils/public-documents';

export {
  PUBLIC_DOCUMENT_CATEGORIES,
  PUBLIC_DOCUMENT_CATEGORY_META,
  getPublicDocumentCategoryByUrlSlug,
  isPublicDocumentCategory,
  type PublicDocumentCategory,
  type PublicDocumentCategoryMeta,
} from '@pmg/utils/public-documents';

export const publicDocuments = pgTable(
  'public_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(), // e.g., "sbd-4", "b-bbee-eme-sworn-affidavit"
    code: text('code'), // Short kicker/badge e.g., "SBD 4", "B-BBEE EME"
    title: text('title').notNull(), // e.g., "SBD 4 - Declaration of Interest"
    subtitle: text('subtitle').notNull().default(''), // e.g., "Declaration of Interest"
    category: text('category').$type<PublicDocumentCategory>().notNull().default('sbd_form'),
    seoTitle: text('seo_title'), // Optional custom <title> override
    seoDescription: text('seo_description').notNull().default(''), // Meta description & card summary
    keywords: jsonb('keywords').$type<string[]>().notNull().default([]), // Target SEO keywords
    content: text('content').notNull().default(''), // Sanitized rich HTML guide content
    commonMistakes: jsonb('common_mistakes').$type<string[]>().notNull().default([]),
    s3Key: text('s3_key').notNull(), // e.g., "tender-templates/sbd-forms/sbd-4-173....pdf"
    fileName: text('file_name').notNull().default(''), // Clean filename for download header
    fileSize: integer('file_size'), // Bytes
    mimeType: text('mime_type').notNull().default('application/pdf'),
    isPublished: boolean('is_published').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(100),
    viewCount: integer('view_count').default(0).notNull(),
    lastViewedAt: timestamp('last_viewed_at'),
    downloadCount: integer('download_count').default(0).notNull(),
    lastDownloadedAt: timestamp('last_downloaded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_public_documents_published_sort').on(
      table.isPublished,
      table.category,
      table.sortOrder,
    ),
  ],
);

export type PublicDocument = typeof publicDocuments.$inferSelect;
export type NewPublicDocument = typeof publicDocuments.$inferInsert;
