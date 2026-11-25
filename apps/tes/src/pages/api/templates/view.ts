import type { APIRoute } from 'astro';
import { getDb, publicDocuments, eq, and, sql, bridgeDatabaseEnv } from '@pmg/db';

const BOT_UA_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|headlesschrome|lighthouse|pingdom|uptimerobot/i;

export const POST: APIRoute = async ({ request }) => {
  const ua = request.headers.get('user-agent') || '';
  if (BOT_UA_PATTERN.test(ua)) {
    return new Response(null, { status: 204 });
  }

  let slug = '';
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { slug?: unknown };
      slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    } else {
      const text = await request.text();
      if (text) {
        try {
          const parsed = JSON.parse(text) as { slug?: unknown };
          slug = typeof parsed?.slug === 'string' ? parsed.slug.trim() : '';
        } catch {
          slug = new URLSearchParams(text).get('slug')?.trim() || '';
        }
      }
    }
  } catch {
    return new Response(null, { status: 204 });
  }

  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return new Response(null, { status: 400 });
  }

  try {
    const env = import.meta.env as Record<string, string | undefined>;
    bridgeDatabaseEnv(env);
    const db = getDb();

    await db
      .update(publicDocuments)
      .set({
        viewCount: sql`${publicDocuments.viewCount} + 1`,
        lastViewedAt: new Date(),
      })
      .where(and(eq(publicDocuments.slug, slug), eq(publicDocuments.isPublished, true)));
  } catch (err) {
    console.warn(`Failed to increment view_count for "${slug}":`, err);
  }

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
};
