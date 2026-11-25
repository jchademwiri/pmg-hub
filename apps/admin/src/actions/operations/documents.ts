'use server';

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sanitizeHtml from 'sanitize-html';
import {
  db,
  publicDocuments,
  eq,
  PUBLIC_DOCUMENT_CATEGORY_META,
  isPublicDocumentCategory,
  type PublicDocumentCategory,
} from '@pmg/db';
import { revalidatePath } from 'next/cache';
import { getR2Client, deleteR2Object } from '@/lib/r2';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';

const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export type DocumentActionResult<T = object> =
  ({ success: true } & T) | { success: false; error: string };

const ALLOWED_DOCUMENT_TYPES: Record<string, { ext: string; label: string }> = {
  'application/pdf': { ext: 'pdf', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: 'docx',
    label: 'DOCX',
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    ext: 'xlsx',
    label: 'XLSX',
  },
};

function resolveFileMetadata(file: File): { ext: string; mimeType: string } | null {
  const mime = (file.type || '').toLowerCase();
  if (ALLOWED_DOCUMENT_TYPES[mime]) {
    return { ext: ALLOWED_DOCUMENT_TYPES[mime].ext, mimeType: mime };
  }

  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    return { ext: 'pdf', mimeType: 'application/pdf' };
  }
  if (name.endsWith('.docx')) {
    return {
      ext: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }
  if (name.endsWith('.xlsx')) {
    return {
      ext: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  return null;
}

function sanitizeRichContent(rawHtml: string): string {
  const trimmed = rawHtml.trim();
  if (!trimmed) return '';

  const baseOptions: sanitizeHtml.IOptions = {
    allowedTags: [
      'h2',
      'h3',
      'p',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'mark',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'br',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(left|center|right|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || '';
        const isExternal = /^https?:\/\//i.test(href);
        return {
          tagName,
          attribs: {
            href,
            ...(isExternal ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}),
          },
        };
      },
    },
  };

  try {
    return sanitizeHtml(trimmed, baseOptions);
  } catch (err) {
    console.warn('sanitizeHtml with allowedStyles failed, retrying without style rules:', err);
    return sanitizeHtml(trimmed, {
      ...baseOptions,
      allowedAttributes: { a: ['href', 'target', 'rel'] },
      allowedStyles: undefined,
    });
  }
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/(\d+)\.(\d+)/g, '$1-$2')
    .replace(/[.\s_()[\]{}#@!$%^&*+=~`|\\:;"'<>,?/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseJsonStringArray(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseCategory(raw: FormDataEntryValue | null): PublicDocumentCategory {
  const val = typeof raw === 'string' ? raw.trim() : '';
  return isPublicDocumentCategory(val) ? val : 'other';
}

function buildR2Key(category: PublicDocumentCategory, slug: string, ext: string): string {
  const folder = PUBLIC_DOCUMENT_CATEGORY_META[category].urlSlug;
  return `tender-templates/${folder}/${slug}-${Date.now()}.${ext}`;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function createDocumentAction(
  formData: FormData,
): Promise<DocumentActionResult<{ slug: string; s3Key: string }>> {
  await getSessionOrRedirect();

  try {
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string)?.trim();
    const rawSlug = (formData.get('slug') as string)?.trim() || title || '';
    const slug = normalizeSlug(rawSlug);
    const code = (formData.get('code') as string)?.trim() || null;
    const subtitle = (formData.get('subtitle') as string)?.trim() || '';
    const category = parseCategory(formData.get('category'));
    const seoTitle = (formData.get('seoTitle') as string)?.trim() || null;
    const seoDescription = (formData.get('seoDescription') as string)?.trim() || '';
    const keywords = parseJsonStringArray(formData.get('keywords'));
    const content = sanitizeRichContent((formData.get('content') as string) || '');
    const commonMistakes = parseJsonStringArray(formData.get('commonMistakes'));
    const isPublished = formData.get('isPublished') !== 'false';
    const sortOrderRaw = Number(formData.get('sortOrder'));
    const sortOrder = Number.isFinite(sortOrderRaw) ? Math.max(0, Math.round(sortOrderRaw)) : 100;

    if (!file || typeof file === 'string' || file.size === 0) {
      return {
        success: false,
        error: 'Please upload a PDF, Word (.docx), or Excel (.xlsx) file.',
      };
    }
    if (!title || !slug) {
      return { success: false, error: 'Document Title and URL Slug are required.' };
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return { success: false, error: 'File size exceeds the 25MB limit.' };
    }

    const fileMeta = resolveFileMetadata(file);
    if (!fileMeta) {
      return {
        success: false,
        error: 'Unsupported file type. Please upload a PDF, DOCX, or XLSX file.',
      };
    }

    const [existing] = await db
      .select({ id: publicDocuments.id })
      .from(publicDocuments)
      .where(eq(publicDocuments.slug, slug))
      .limit(1);

    if (existing) {
      return {
        success: false,
        error: `A template with slug "${slug}" already exists. Edit the existing template or use a different slug.`,
      };
    }

    const { client, bucket } = getR2Client();
    const s3Key = buildR2Key(category, slug, fileMeta.ext);
    const buffer = Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: fileMeta.mimeType,
      }),
    );

    const cleanDownloadFileName = `${slug}.${fileMeta.ext}`;

    await db.insert(publicDocuments).values({
      slug,
      code,
      title,
      subtitle,
      category,
      seoTitle,
      seoDescription,
      keywords,
      content,
      commonMistakes,
      s3Key,
      fileName: cleanDownloadFileName,
      fileSize: file.size,
      mimeType: fileMeta.mimeType,
      isPublished,
      sortOrder,
      viewCount: 0,
      downloadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath('/documents');
    return { success: true, slug, s3Key };
  } catch (err) {
    console.error('[createDocumentAction] Failed:', err);
    return {
      success: false,
      error: getErrorMessage(err, 'Failed to create template. Please try again.'),
    };
  }
}

export async function updateDocumentAction(
  id: string,
  formData: FormData,
): Promise<DocumentActionResult<{ slug: string; s3Key: string }>> {
  await getSessionOrRedirect();

  try {
    if (!id) return { success: false, error: 'Document ID is required.' };

    const [existing] = await db
      .select()
      .from(publicDocuments)
      .where(eq(publicDocuments.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Document not found.' };
    }

    const title = (formData.get('title') as string)?.trim();
    if (!title) {
      return { success: false, error: 'Document Title is required.' };
    }

    const code = (formData.get('code') as string)?.trim() || null;
    const subtitle = (formData.get('subtitle') as string)?.trim() || '';
    const category = parseCategory(formData.get('category'));
    const seoTitle = (formData.get('seoTitle') as string)?.trim() || null;
    const seoDescription = (formData.get('seoDescription') as string)?.trim() || '';
    const keywords = parseJsonStringArray(formData.get('keywords'));
    const content = sanitizeRichContent((formData.get('content') as string) || '');
    const commonMistakes = parseJsonStringArray(formData.get('commonMistakes'));
    const isPublished = formData.get('isPublished') !== 'false';
    const sortOrderRaw = Number(formData.get('sortOrder'));
    const sortOrder = Number.isFinite(sortOrderRaw)
      ? Math.max(0, Math.round(sortOrderRaw))
      : existing.sortOrder;

    const replacementFile = formData.get('file') as File | null;
    let nextS3Key = existing.s3Key;
    let nextFileName = existing.fileName;
    let nextFileSize = existing.fileSize;
    let nextMimeType = existing.mimeType;
    let oldS3KeyToDelete: string | null = null;

    if (replacementFile && typeof replacementFile !== 'string' && replacementFile.size > 0) {
      if (replacementFile.size > MAX_DOCUMENT_SIZE_BYTES) {
        return { success: false, error: 'File size exceeds the 25MB limit.' };
      }
      const fileMeta = resolveFileMetadata(replacementFile);
      if (!fileMeta) {
        return {
          success: false,
          error: 'Unsupported file type. Please upload a PDF, DOCX, or XLSX file.',
        };
      }

      const { client, bucket } = getR2Client();
      const newKey = buildR2Key(category, existing.slug, fileMeta.ext);
      const buffer = Buffer.from(await replacementFile.arrayBuffer());

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: newKey,
          Body: buffer,
          ContentType: fileMeta.mimeType,
        }),
      );

      oldS3KeyToDelete = existing.s3Key;
      nextS3Key = newKey;
      nextFileName = `${existing.slug}.${fileMeta.ext}`;
      nextFileSize = replacementFile.size;
      nextMimeType = fileMeta.mimeType;
    }

    await db
      .update(publicDocuments)
      .set({
        code,
        title,
        subtitle,
        category,
        seoTitle,
        seoDescription,
        keywords,
        content,
        commonMistakes,
        s3Key: nextS3Key,
        fileName: nextFileName,
        fileSize: nextFileSize,
        mimeType: nextMimeType,
        isPublished,
        sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(publicDocuments.id, id));

    if (oldS3KeyToDelete && oldS3KeyToDelete !== nextS3Key) {
      await deleteR2Object(oldS3KeyToDelete);
    }

    revalidatePath('/documents');
    revalidatePath(`/documents/${id}/edit`);
    return { success: true, slug: existing.slug, s3Key: nextS3Key };
  } catch (err) {
    console.error('[updateDocumentAction] Failed:', err);
    return {
      success: false,
      error: getErrorMessage(err, 'Failed to update template. Please try again.'),
    };
  }
}

export async function toggleDocumentPublishAction(
  id: string,
  isPublished: boolean,
): Promise<DocumentActionResult> {
  await getSessionOrRedirect();

  try {
    await db
      .update(publicDocuments)
      .set({
        isPublished,
        updatedAt: new Date(),
      })
      .where(eq(publicDocuments.id, id));

    revalidatePath('/documents');
    return { success: true };
  } catch (err) {
    console.error('[toggleDocumentPublishAction] Failed:', err);
    return {
      success: false,
      error: getErrorMessage(err, 'Failed to update publish status.'),
    };
  }
}

export async function deleteDocumentAction(id: string): Promise<DocumentActionResult> {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'admin')) {
    return { success: false, error: 'Only admins can delete public templates.' };
  }

  try {
    const [existing] = await db
      .select()
      .from(publicDocuments)
      .where(eq(publicDocuments.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Document not found.' };
    }

    await db.delete(publicDocuments).where(eq(publicDocuments.id, id));

    if (existing.s3Key) {
      await deleteR2Object(existing.s3Key);
    }

    revalidatePath('/documents');
    return { success: true };
  } catch (err) {
    console.error('[deleteDocumentAction] Failed:', err);
    return {
      success: false,
      error: getErrorMessage(err, 'Failed to delete template.'),
    };
  }
}

export async function getDocumentPreviewUrlAction(
  id: string,
): Promise<DocumentActionResult<{ url: string; fileName: string }>> {
  await getSessionOrRedirect();

  try {
    const [doc] = await db
      .select()
      .from(publicDocuments)
      .where(eq(publicDocuments.id, id))
      .limit(1);

    if (!doc) {
      return { success: false, error: 'Document not found.' };
    }

    const { client, bucket } = getR2Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: doc.s3Key,
      ResponseContentDisposition: `inline; filename="${doc.fileName || `${doc.slug}.pdf`}"`,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 300 });
    return { success: true, url, fileName: doc.fileName || `${doc.slug}.pdf` };
  } catch (err) {
    console.error('[getDocumentPreviewUrlAction] Failed:', err);
    return {
      success: false,
      error: getErrorMessage(err, 'Could not generate preview link.'),
    };
  }
}

// Backwards-compatible alias if any caller still references uploadDocumentAction
export const uploadDocumentAction = createDocumentAction;
