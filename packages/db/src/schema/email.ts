import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { divisions } from "./divisions";
import { user } from "./auth";

export const emailAuditStatusEnum = pgEnum("email_audit_status", [
  "success",
  "failed",
  "cancelled",
]);

export const emailAuditTypeEnum = pgEnum("email_audit_type", [
  "overdue_reminder",
  "payment_receipt",
  "invoice",
  "quote",
  "custom",
]);

export const emailAuditLog = pgTable(
  "email_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resendEmailId: text("resend_email_id"),
    emailType: emailAuditTypeEnum("email_type").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject").notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
    sentBy: text("sent_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: emailAuditStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    customizationDetails: jsonb("customization_details").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("email_audit_log_client_id_idx").on(t.clientId),
    index("email_audit_log_division_id_idx").on(t.divisionId),
    index("email_audit_log_status_idx").on(t.status),
    index("email_audit_log_created_at_idx").on(t.createdAt),
    index("email_audit_log_idempotency_key_idx").on(t.idempotencyKey),
  ],
);

export type EmailAuditLog = typeof emailAuditLog.$inferSelect;
export type NewEmailAuditLog = typeof emailAuditLog.$inferInsert;
