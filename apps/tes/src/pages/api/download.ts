import type { APIRoute } from 'astro';
import { getDb, publicDocuments, eq, sql, bridgeDatabaseEnv } from '@pmg/db';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_R2_ACCOUNT_ID = '0328a0109a7579bb99ee877b94d6661b';
const DEFAULT_R2_ACCESS_KEY_ID = '335f9847d35e67d4b74584b23a8deb21';
const DEFAULT_R2_SECRET_ACCESS_KEY =
  '16f5cd392abd63cd81b9d65c2f32ed5ce3bfda070e460e4fbd9edfb7953d71dc';
const DEFAULT_R2_BUCKET = 'pmg-hub';

function getR2Client() {
  const accountId =
    import.meta.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    DEFAULT_R2_ACCOUNT_ID;
  const accessKeyId =
    import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    import.meta.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    DEFAULT_R2_ACCESS_KEY_ID;
  const secretAccessKey =
    import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    import.meta.env.AWS_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    DEFAULT_R2_SECRET_ACCESS_KEY;
  const bucket =
    import.meta.env.CLOUDFLARE_R2_BUCKET ||
    process.env.CLOUDFLARE_R2_BUCKET ||
    import.meta.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET_NAME ||
    DEFAULT_R2_BUCKET;

  const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;

  const client = new S3Client({
    region: accountId
      ? 'auto'
      : import.meta.env.AWS_REGION || process.env.AWS_REGION || 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket };
}

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const formSlug = searchParams.get('form')?.trim();
  const format = searchParams.get('format');
  const acceptHeader = request.headers.get('accept') || '';
  const wantsJson = format === 'json' || acceptHeader.includes('application/json');

  const errorResponse = (message: string, code: string, status: number) => {
    if (wantsJson) {
      return new Response(
        JSON.stringify({
          success: false,
          error: message,
          code,
          whatsappUrl: `https://wa.me/27745017094?text=${encodeURIComponent(
            `Hi, I need help downloading the ${formSlug || 'SBD'} form.`,
          )}`,
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Direct browser navigation fallback: redirect back to UI with error param
    const redirectUrl = formSlug
      ? `/sbd-forms/${encodeURIComponent(formSlug)}?error=${encodeURIComponent(code)}`
      : `/sbd-forms?error=${encodeURIComponent(code)}`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  };

  if (!formSlug) {
    return errorResponse('Form parameter is required', 'MISSING_PARAM', 400);
  }

  // Bridge Astro environment variables into process.env for @pmg/db
  const env = import.meta.env as Record<string, string | undefined>;
  bridgeDatabaseEnv(env);

  try {
    const db = getDb();
    const docs = await db
      .select()
      .from(publicDocuments)
      .where(eq(publicDocuments.slug, formSlug))
      .limit(1);
    const doc = docs[0];

    if (!doc) {
      return errorResponse(
        'The requested form was not found in the database.',
        'FORM_NOT_FOUND',
        404,
      );
    }

    // Increment download counter asynchronously
    await db
      .update(publicDocuments)
      .set({ downloadCount: sql`${publicDocuments.downloadCount} + 1` })
      .where(eq(publicDocuments.id, doc.id))
      .catch((err) => console.warn('Could not increment download count:', err));

    const { client, bucket } = getR2Client();
    const safeFilename = `${formSlug.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: doc.s3Key,
      ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    if (wantsJson) {
      return new Response(
        JSON.stringify({
          success: true,
          url: presignedUrl,
          filename: safeFilename,
          title: doc.title,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: presignedUrl,
      },
    });
  } catch (error) {
    console.error('Download error in /api/download:', error);
    return errorResponse(
      'An unexpected error occurred while preparing your download.',
      'STORAGE_ERROR',
      500,
    );
  }
};
