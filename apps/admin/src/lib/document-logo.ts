export const DOCUMENT_LOGOS = {
  tes: '/logo/tes-logo.svg',
  pmg: '/logo/pmg-logo.svg',
  apex: '/logo/apex-logo.svg',
  default: '/logo/default-logo.svg',
} as const;

export function getDocumentLogoUrl(orgName?: string): string {
  if (!orgName) return DOCUMENT_LOGOS.default;

  const normalized = orgName.toLowerCase();
  if (/tender edge|edge solutions|tes/.test(normalized)) {
    return DOCUMENT_LOGOS.tes;
  }

  if (/apex web|apex/.test(normalized)) {
    return DOCUMENT_LOGOS.apex;
  }

  if (/playhouse media|playhouse|pmg/.test(normalized)) {
    return DOCUMENT_LOGOS.pmg;
  }

  return DOCUMENT_LOGOS.default;
}
