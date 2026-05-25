// Send utilities
export { sendEmail, createEmailClient, renderEmailTemplate } from "./send";
export type { ResendConfig, EmailPayload, SendResult } from "./send";

// Shared branding interface
export type { BrandingProps } from "./types";

// Templates
export { default as AdminNewLeadEmail } from "./templates/AdminNewLeadEmail";
export { default as AutoReplyEmail } from "./templates/AutoReplyEmail";
export { default as InvoiceDeliveryEmail } from "./templates/InvoiceDeliveryEmail";
export { default as QuoteDeliveryEmail } from "./templates/QuoteDeliveryEmail";
export { default as PaymentThankYouEmail } from "./templates/PaymentThankYouEmail";
export { default as OutstandingReminderEmail } from "./templates/OutstandingReminderEmail";
export { default as MagicLinkEmail } from "./templates/MagicLinkEmail";
export { default as InvitationEmail } from "./templates/InvitationEmail";

// Template prop types
export type { AdminNewLeadEmailProps } from "./templates/AdminNewLeadEmail";
export type { AutoReplyEmailProps } from "./templates/AutoReplyEmail";
export type { InvoiceDeliveryEmailProps } from "./templates/InvoiceDeliveryEmail";
export type { QuoteDeliveryEmailProps } from "./templates/QuoteDeliveryEmail";
export type { PaymentThankYouEmailProps } from "./templates/PaymentThankYouEmail";
export type { OutstandingReminderEmailProps } from "./templates/OutstandingReminderEmail";
export type { MagicLinkEmailProps } from "./templates/MagicLinkEmail";
export type { InvitationEmailProps } from "./templates/InvitationEmail";

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

export {
  resolveBrandEmailConfig,
  toResendConfig,
} from "./brand-config";
export type { BrandEmailConfig } from "./brand-config";
