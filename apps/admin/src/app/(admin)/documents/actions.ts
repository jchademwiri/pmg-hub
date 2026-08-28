'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db, publicDocuments } from '@pmg/db';
import { revalidatePath } from 'next/cache';

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.AWS_S3_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'Cloudflare R2 storage credentials or bucket name are missing from environment.',
    );
  }

  const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;

  const client = new S3Client({
    region: accountId ? 'auto' : process.env.AWS_REGION || 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket };
}

export async function uploadDocumentAction(formData: FormData) {
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
