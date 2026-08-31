'use server';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { db, publicDocuments } from '@pmg/db';
import { revalidatePath } from 'next/cache';
import { getR2Client } from '@/lib/r2';
import { getSessionOrRedirect } from '@/lib/auth';

export async function uploadDocumentAction(formData: FormData) {
  await getSessionOrRedirect();

  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string)?.trim();
  const slug = (formData.get('slug') as string)?.trim();

  if (!file || !title || !slug) {
    throw new Error('File, Title, and Slug are all required.');
  }

  const { client, bucket } = getR2Client();

  // Create clean R2 key in sbd-forms folder
  const cleanFileName = file.name.trim().replace(/\s+/g, '-');
  const s3Key = `sbd-forms/${Date.now()}-${cleanFileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 1. Upload directly server-to-server to Cloudflare R2 (No browser CORS issues)
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: file.type || 'application/pdf',
  });

  await client.send(command);

  // 2. Save or update metadata in Postgres (handles version updates cleanly)
  await db
    .insert(publicDocuments)
    .values({
      title,
      slug,
      s3Key,
      downloadCount: 0,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: publicDocuments.slug,
      set: {
        title,
        s3Key,
        updatedAt: new Date(),
      },
    });

  revalidatePath('/documents');
  return { success: true, s3Key };
}
