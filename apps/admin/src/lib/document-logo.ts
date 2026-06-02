export const DOCUMENT_LOGOS = {
  tes: '/logo/tes-logo.png',
  pmg: '/logo/pmg-logo.png',
  aws: '/logo/aws-logo.png',
  default: '/logo/pmg-logo.png',
} as const;

export function getDocumentLogoUrl(orgName?: string): string {
  if (!orgName) return DOCUMENT_LOGOS.default;

  const normalized = orgName.toLowerCase();
  if (/tender edge|edge solutions|tes/.test(normalized)) {
    return DOCUMENT_LOGOS.tes;
  }

  if (/apex web|apex|aws/.test(normalized)) {
    return DOCUMENT_LOGOS.aws;
  }

  if (/playhouse media|playhouse|pmg/.test(normalized)) {
    return DOCUMENT_LOGOS.pmg;
  }

  return DOCUMENT_LOGOS.default;
}

export function getDocumentLogoText(orgName?: string): string {
  if (!orgName) return 'PMG';

  const normalized = orgName.toLowerCase();
  if (/tender edge|edge solutions|tes/.test(normalized)) {
    return 'TES';
  }

  if (/apex web|apex|aws/.test(normalized)) {
    return 'AWS';
  }

  if (/playhouse media|playhouse|pmg/.test(normalized)) {
    return 'PMG';
  }

  return 'PMG';
}
