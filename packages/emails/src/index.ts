// Send utilities
export { sendEmail, createEmailClient } from "./send";
export type { ResendConfig, EmailPayload, SendResult } from "./send";

// Shared branding interface
export type { BrandingProps } from "./types";

// Templates
export { default as AdminNewLeadEmail } from "./templates/AdminNewLeadEmail";
export { default as AutoReplyEmail } from "./templates/AutoReplyEmail";

// Template prop types
export type { AdminNewLeadEmailProps } from "./templates/AdminNewLeadEmail";
export type { AutoReplyEmailProps } from "./templates/AutoReplyEmail";
