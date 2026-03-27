import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const awsPackageTypeEnum = pgEnum("aws_package_type", [
  "monthly",
  "once_off",
]);

export const awsMessageStatusEnum = pgEnum("aws_message_status", [
  "new",
  "read",
  "replied",
  "archived",
]);

export const awsBookingStatusEnum = pgEnum("aws_booking_status", [
  "new",
  "contacted",
  "active",
  "completed",
  "cancelled",
]);

export const awsMessages = pgTable(
  "aws_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject"),
    message: text("message").notNull(),
    newsletterOptIn: boolean("newsletter_opt_in").default(false),
    status: awsMessageStatusEnum("status").notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("aws_messages_status_idx").on(table.status),
    index("aws_messages_email_idx").on(table.email),
  ]
);

export const awsBookings = pgTable(
  "aws_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    packageName: text("package_name").notNull(),
    packagePrice: integer("package_price").notNull(),
    packageType: awsPackageTypeEnum("package_type").notNull(),
    newsletterOptIn: boolean("newsletter_opt_in").default(false),
    status: awsBookingStatusEnum("status").notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("aws_bookings_status_idx").on(table.status),
    index("aws_bookings_email_idx").on(table.email),
  ]
);

export const awsPricing = pgTable("aws_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  price: integer("price").notNull(),
  period: text("period"),
  upfront: integer("upfront"),
  description: text("description").notNull(),
  features: jsonb("features").notNull().$type<string[]>(),
  cta: text("cta").notNull(),
  popular: boolean("popular").default(false),
  type: awsPackageTypeEnum("type").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export type AwsMessage = typeof awsMessages.$inferSelect;
export type NewAwsMessage = typeof awsMessages.$inferInsert;
export type AwsBooking = typeof awsBookings.$inferSelect;
export type NewAwsBooking = typeof awsBookings.$inferInsert;
export type AwsPricing = typeof awsPricing.$inferSelect;
export type NewAwsPricing = typeof awsPricing.$inferInsert;
