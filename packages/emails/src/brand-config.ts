import type { BrandKey } from "./domains";
import {
  BRAND_ADMIN_EMAIL,
  BRAND_FROM_EMAIL,
  DOMAINS,
  RESEND_API_KEY_ENV,
} from "./domains";

export interface BrandEmailConfig {
  apiKey: string;
  from: string;
  adminEmail: string;
  websiteUrl: string;
  companyName: string;
  primaryColor: string;
  logoUrl?: string;
}

const BRAND_META: Record<
  BrandKey,
  {
    companyName: string;
    websiteUrl: string;
    primaryColor: string;
    logoUrl?: string;
    fromEnv: string;
    adminEnv: string;
  }
> = {
  tes: {
    companyName: "Tender Edge Solutions",
    websiteUrl: "https://www.tenderedgesolutions.co.za",
    primaryColor: "#c9a227",
    fromEnv: "TES_FROM_EMAIL",
    adminEnv: "TES_ADMIN_EMAIL",
  },
  aws: {
    companyName: "Apex Web Solutions",
    websiteUrl: "https://apexwebsolutions.co.za",
    primaryColor: "#1d4ed8",
    logoUrl: "https://apexwebsolutions.co.za/logo.png",
    fromEnv: "AWS_FROM_EMAIL",
    adminEnv: "AWS_ADMIN_EMAIL",
  },
  pmg: {
    companyName: "Playhouse Media Group",
    websiteUrl: "https://playhousemedia.co.za",
    primaryColor: "#f97316",
    fromEnv: "PMG_FROM_EMAIL",
    adminEnv: "PMG_ADMIN_EMAIL",
  },
};

/**
 * Resolve Resend credentials and branding for an Astro app from import.meta.env.
 * Falls back to canonical defaults in domains.ts when env vars are unset.
 */
export function resolveBrandEmailConfig(
  brand: BrandKey,
  env: Record<string, string | undefined>,
): BrandEmailConfig {
  const meta = BRAND_META[brand];
  const apiKeyEnv = RESEND_API_KEY_ENV[brand];
  const apiKey = (env[apiKeyEnv] || env.RESEND_API_KEY || "").trim();
  const from = env[meta.fromEnv] || BRAND_FROM_EMAIL[brand];
  const adminEmail = env[meta.adminEnv] || BRAND_ADMIN_EMAIL[brand];

  if (!apiKey) {
    console.warn(
      `[emails] ${apiKeyEnv} is not set — emails for "${brand}" (${DOMAINS[brand]}) will fail.`,
    );
  }

  const expectedDomain = DOMAINS[brand];
  const fromDomain = from.split("@")[1]?.toLowerCase();
  if (fromDomain && !fromDomain.endsWith(expectedDomain)) {
    console.warn(
      `[emails] "${brand}" from address "${from}" does not match verified domain "${expectedDomain}".`,
    );
  }

  return {
    apiKey,
    from,
    adminEmail,
    websiteUrl: meta.websiteUrl,
    companyName: meta.companyName,
    primaryColor: meta.primaryColor,
    logoUrl: meta.logoUrl,
  };
}

export function toResendConfig(config: BrandEmailConfig) {
  return {
    apiKey: config.apiKey,
    from: config.from,
    adminEmail: config.adminEmail,
  };
}
