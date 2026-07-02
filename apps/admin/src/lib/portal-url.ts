export function getPortalBaseUrl(): string {
  const url = process.env.PORTAL_URL;
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url;
  }
  if (process.env.VERCEL_ENV === 'preview') {
    return 'https://client.playhousemedia.co.za';
  }
  if (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  ) {
    return 'https://portal.playhousemedia.co.za';
  }
  return url || 'http://localhost:3001';
}
