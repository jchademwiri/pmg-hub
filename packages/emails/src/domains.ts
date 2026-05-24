export const DOMAINS = {
  pmg: 'playhousemedia.co.za',
  tes: 'tenderedgesolutions.co.za',
  aws: 'apexwebsolutions.co.za',
} as const;

export const DEFAULT_EMAIL_FROM = `noreply@info.${DOMAINS.pmg}`;
export const DEFAULT_REPLY_TO = `info@${DOMAINS.pmg}`;
export const DEFAULT_WEBSITE_URL = `https://${DOMAINS.pmg}`;
