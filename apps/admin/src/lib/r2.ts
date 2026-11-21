import 'server-only';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ALLOWED_LEAVE_PROOF_MIME_TYPES,
  MAX_LEAVE_PROOF_SIZE_BYTES,
  buildLeaveProofKey,
} from '@/lib/leave';

export function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'pmg-hub';

  if (!accountId) throw new Error('CLOUDFLARE_R2_ACCOUNT_ID is not configured');
  if (!accessKeyId)
    throw new Error('R2 access key is not configured (CLOUDFLARE_R2_ACCESS_KEY_ID)');
  if (!secretAccessKey)
    throw new Error('R2 secret access key is not configured (CLOUDFLARE_R2_SECRET_ACCESS_KEY)');

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: 'auto',
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
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

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
  } catch (err: unknown) {
    console.error('Failed to upload receipt to R2:', err);
    return { error: 'Failed to upload receipt file to cloud storage.' };
  }
}

export async function generateReceiptPresignedUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { client, bucket } = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

// ── Leave Proof Document Helpers ──────────────────────────────────────────────

export async function uploadLeaveProofToR2(
  file: File | null,
  entryId: number,
  startDate: string,
): Promise<{
  key?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
}> {
  if (!file || typeof file === 'string' || file.size === 0 || file.name === 'undefined') {
    return { error: 'Please select a file to upload.' };
  }

  if (file.size > MAX_LEAVE_PROOF_SIZE_BYTES) {
    return { error: 'File size exceeds 10MB limit.' };
  }

  const mime = (file.type || '').toLowerCase();
  const mimeMatch = (ALLOWED_LEAVE_PROOF_MIME_TYPES as readonly string[]).includes(mime);
  const nameMatch = /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
  if (!mimeMatch && !nameMatch) {
    return { error: 'Only PDF, PNG, JPG, JPEG, and WEBP files are allowed.' };
  }

  try {
    const { client, bucket } = getR2Client();
    const s3Key = buildLeaveProofKey(startDate, entryId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return {
      key: s3Key,
      fileName: file.name,
      mimeType: contentType,
      sizeBytes: file.size,
    };
  } catch (err: unknown) {
    console.error('Failed to upload leave proof to R2:', err);
    return { error: 'Failed to upload proof file to cloud storage.' };
  }
}

export async function deleteR2Object(key: string): Promise<void> {
  if (!key) return;
  try {
    const { client, bucket } = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch (err: unknown) {
    // Non-fatal: object may already be removed
    console.warn(`Failed to delete R2 object "${key}":`, err);
  }
}

export async function generateLeaveProofPresignedUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  return generateReceiptPresignedUrl(key, expiresInSeconds);
}
