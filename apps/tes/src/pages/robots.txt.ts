import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL('sitemap-index.xml', site);
  const documentsSitemapURL = new URL('sitemap-documents.xml', site);
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${sitemapURL.href}\nSitemap: ${documentsSitemapURL.href}\n`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
};
