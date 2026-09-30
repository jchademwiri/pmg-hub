import type { APIRoute } from 'astro';
import { getDb, publicDocuments, eq, sql, bridgeDatabaseEnv } from '@pmg/db';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Config() {
  const accountId =
    import.meta.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId =
    import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    import.meta.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    import.meta.env.AWS_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;
  const bucket =
    import.meta.env.CLOUDFLARE_R2_BUCKET ||
    process.env.CLOUDFLARE_R2_BUCKET ||
    import.meta.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET_NAME ||
    'pmg-hub';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getR2Client() {
  const config = getR2Config();
  if (!config) return null;

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client, bucket: config.bucket };
}

const KNOWN_FORMS: Record<string, { title: string; filename: string; staticPath: string }> = {
  'sbd-4': {
    title: 'SBD 4: Declaration of Interest',
    filename: 'sbd-4.pdf',
    staticPath: '/documents/sbd-4.pdf',
  },
  'sbd-6-1': {
    title: 'SBD 6.1: Preference Points Claim',
    filename: 'sbd-6.1.pdf',
    staticPath: '/documents/sbd-6-1.pdf',
  },
  'sbd-8': {
    title: 'SBD 8: Supply Chain Practices',
    filename: 'sbd-8.pdf',
    staticPath: '/documents/sbd-8.pdf',
  },
  'sbd-9': {
    title: 'SBD 9: Independent Bid Determination',
    filename: 'sbd-9.pdf',
    staticPath: '/documents/sbd-9.pdf',
  },
};

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

  const knownForm = KNOWN_FORMS[formSlug];
  let docTitle = knownForm?.title || formSlug.toUpperCase();
  let s3Key: string | null = null;

  // Attempt database lookup & download count increment
  try {
    const db = getDb();
    const docs = await db
      .select()
      .from(publicDocuments)
      .where(eq(publicDocuments.slug, formSlug))
      .limit(1);

    if (docs[0]) {
      docTitle = docs[0].title;
      s3Key = docs[0].s3Key;

      await db
        .update(publicDocuments)
        .set({
          downloadCount: sql`${publicDocuments.downloadCount} + 1`,
          lastDownloadedAt: new Date(),
        })
        .where(eq(publicDocuments.id, docs[0].id))
        .catch((err) => console.warn('Could not increment download count:', err));
    }
  } catch (dbError) {
    console.warn('Database lookup/counter error in /api/download:', dbError);
  }

  // If not found in DB and not a known static form, return 404
  if (!s3Key && !knownForm) {
    return errorResponse(
      'The requested form was not found in the database.',
      'FORM_NOT_FOUND',
      404,
    );
  }

  const safeFilename = knownForm?.filename || `${formSlug.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
  let downloadUrl: string | null = null;

  // 1. Try Cloudflare R2 presigned URL if configured and object key exists
  try {
    const r2 = getR2Client();
    if (r2 && s3Key) {
      const command = new GetObjectCommand({
        Bucket: r2.bucket,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
      });
      downloadUrl = await getSignedUrl(r2.client, command, { expiresIn: 300 });
    }
  } catch (r2Error) {
    console.warn('Failed to generate presigned R2 URL, falling back to static copy:', r2Error);
  }

  // 2. Fall back to bundled static document if R2 is unconfigured or failed
  if (!downloadUrl && knownForm) {
    downloadUrl = knownForm.staticPath;
  }

  if (!downloadUrl) {
    return errorResponse(
      'The document storage is not configured. Please contact support.',
      'CONFIG_ERROR',
      503,
    );
  }

  if (wantsJson) {
    return new Response(
      JSON.stringify({
        success: true,
        url: downloadUrl,
        filename: safeFilename,
        title: docTitle,
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
      Location: downloadUrl,
    },
  });
};
