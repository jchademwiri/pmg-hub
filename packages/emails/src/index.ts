// Send utilities
export { sendEmail, createEmailClient } from "./send";
export type { ResendConfig, EmailPayload, SendResult } from "./send";

// Shared branding interface
export type { BrandingProps } from "./types";

// Templates
export { default as ContactFormEmail } from "./templates/ContactFormEmail";
export { default as AutoReplyEmail } from "./templates/AutoReplyEmail";
export { default as BookingConfirmationEmail } from "./templates/BookingConfirmationEmail";
export { default as NewSubscriberEmail } from "./templates/NewSubscriberEmail";
export { default as AdminNewLeadEmail } from "./templates/AdminNewLeadEmail";

// Template prop types
export type { ContactFormEmailProps } from "./templates/ContactFormEmail";
export type { AutoReplyEmailProps } from "./templates/AutoReplyEmail";
export type { BookingConfirmationEmailProps } from "./templates/BookingConfirmationEmail";
export type { NewSubscriberEmailProps } from "./templates/NewSubscriberEmail";
export type { AdminNewLeadEmailProps } from "./templates/AdminNewLeadEmail";
