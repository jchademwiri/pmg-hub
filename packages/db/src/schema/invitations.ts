import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["super_admin", "admin", "viewer"] }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  // Better Auth auto-creates the `user` table via its Drizzle adapter.
  // The FK constraint to user.id is enforced in the migration SQL directly
  // to avoid a circular dependency with the Better Auth-managed schema.
  invitedBy: uuid("invited_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
