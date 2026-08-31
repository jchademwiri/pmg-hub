import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function getR2Client() {
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

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export async function uploadReceiptToR2(file: File | null): Promise<{
  url?: string;
  key?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}> {
  if (!file || typeof file === 'string' || file.size === 0 || file.name === 'undefined') return {};

  if (file.size > MAX_RECEIPT_SIZE) {
    return { error: 'File size exceeds 10MB limit.' };
  }

  const mimeMatch = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const nameMatch = /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
  if (!mimeMatch && !nameMatch) {
    return { error: 'Only PDF, PNG, JPG, JPEG, and WEBP files are allowed.' };
  }

  try {
    const { client, bucket } = getR2Client();

    const cleanFileName = file.name.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `receipts/${Date.now()}-${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await client.send(command);

    return {
      url: `/api/receipts?key=${encodeURIComponent(s3Key)}`,
      key: s3Key,
      fileName: file.name,
      fileSize: file.size,
    };
  } catch (err: any) {
    console.error('Failed to upload receipt to R2:', err);
    return { error: 'Failed to upload receipt file to cloud storage.' };
  }
}

export async function generateReceiptPresignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { client, bucket } = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
