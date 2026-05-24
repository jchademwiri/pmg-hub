// Send utilities
export { sendEmail, createEmailClient } from "./send";
export type { ResendConfig, EmailPayload, SendResult } from "./send";

// Shared branding interface
export type { BrandingProps } from "./types";

// Templates
export { default as AdminNewLeadEmail } from "./templates/AdminNewLeadEmail";
export { default as AutoReplyEmail } from "./templates/AutoReplyEmail";
export { default as InvoiceDeliveryEmail } from "./templates/InvoiceDeliveryEmail";
export { default as QuoteDeliveryEmail } from "./templates/QuoteDeliveryEmail";

// Template prop types
export type { AdminNewLeadEmailProps } from "./templates/AdminNewLeadEmail";
export type { AutoReplyEmailProps } from "./templates/AutoReplyEmail";
export type { InvoiceDeliveryEmailProps } from "./templates/InvoiceDeliveryEmail";
export type { QuoteDeliveryEmailProps } from "./templates/QuoteDeliveryEmail";

// Central config
export {
  DOMAINS,
  RESEND_API_KEY_ENV,
  BRAND_FROM_EMAIL,
  BRAND_REPLY_TO,
  DEFAULT_EMAIL_FROM,
  DEFAULT_REPLY_TO,
  DEFAULT_WEBSITE_URL,
  getResendApiKey,
} from "./domains";
export type { BrandKey } from "./domains";

