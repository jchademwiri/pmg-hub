export function getPortalBaseUrl(): string {
  const url = process.env.PORTAL_URL;
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url;
  }

  if (process.env.VERCEL_ENV === 'preview') {
    return 'https://client.playhousemedia.co.za';
  }

  // Production: PORTAL_URL env var is REQUIRED to distinguish staging vs prod,
  // since both have VERCEL_ENV === 'production' on custom domains.
  // Staging admin: app.playhousemedia.co.za → set PORTAL_URL=https://client.playhousemedia.co.za
  // Production admin: admin.playhousemedia.co.za → set PORTAL_URL=https://portal.playhousemedia.co.za
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    console.warn('[getPortalBaseUrl] PORTAL_URL not set — returning production fallback');
    return 'https://portal.playhousemedia.co.za';
  }

  return url || 'http://localhost:3001';
}
