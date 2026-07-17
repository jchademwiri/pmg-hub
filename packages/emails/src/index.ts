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
export { default as AdminQuoteAcceptedEmail } from "./templates/AdminQuoteAcceptedEmail";
export { default as PortalInvitationEmail } from "./templates/PortalInvitationEmail";
export { default as ComplianceReminderEmail } from "./templates/ComplianceReminderEmail";

// Template prop types
export type { AdminNewLeadEmailProps } from "./templates/AdminNewLeadEmail";
export type { AutoReplyEmailProps } from "./templates/AutoReplyEmail";
export type { InvoiceDeliveryEmailProps } from "./templates/InvoiceDeliveryEmail";
export type { QuoteDeliveryEmailProps } from "./templates/QuoteDeliveryEmail";
export type { PaymentThankYouEmailProps } from "./templates/PaymentThankYouEmail";
export type { OutstandingReminderEmailProps } from "./templates/OutstandingReminderEmail";
export type { MagicLinkEmailProps } from "./templates/MagicLinkEmail";
export type { InvitationEmailProps } from "./templates/InvitationEmail";
export type { AdminQuoteAcceptedEmailProps } from "./templates/AdminQuoteAcceptedEmail";
export type { PortalInvitationEmailProps } from "./templates/PortalInvitationEmail";
export type { ComplianceReminderEmailProps } from "./templates/ComplianceReminderEmail";

// Central config
export {
  DOMAINS,
  RESEND_API_KEY_ENV,
  BRAND_FROM_EMAIL,
  BRAND_REPLY_TO,
  BRAND_ADMIN_EMAIL,
  DEFAULT_EMAIL_FROM,
  DEFAULT_REPLY_TO,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_WEBSITE_URL,
  getResendApiKey,
  resolveDivisionAdminEmail,
  resolveFromEmail,
  resolveResendApiKey,
  resolveDefaultFromEmail,
} from "./domains";
export type { BrandKey } from "./domains";

export {
  resolveBrandEmailConfig,
  toResendConfig,
} from "./brand-config";
export type { BrandEmailConfig } from "./brand-config";
