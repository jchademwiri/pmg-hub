import type { APIRoute } from 'astro';
import { getPublishedDocuments, getActiveCategoryList } from '../lib/public-documents';

const SITE_URL = 'https://www.tenderedgesolutions.co.za';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const documents = await getPublishedDocuments();
  const activeCategories = getActiveCategoryList(documents);
  const nowIso = new Date().toISOString();

  const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
    {
      loc: `${SITE_URL}/templates`,
      lastmod: nowIso,
      changefreq: 'weekly',
      priority: '0.9',
    },
    ...activeCategories.map((cat) => ({
      loc: `${SITE_URL}/templates/category/${cat.urlSlug}`,
      lastmod: nowIso,
      changefreq: 'weekly',
      priority: '0.85',
    })),
    ...documents.map((doc) => ({
      loc: `${SITE_URL}/templates/${doc.slug}`,
      lastmod: new Date(doc.updatedAt).toISOString(),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    ),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
