import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

export const awsPackageTypeEnum = pgEnum("aws_package_type", [
  "monthly",
  "once_off",
]);

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

export type AwsPricing = typeof awsPricing.$inferSelect;
export type NewAwsPricing = typeof awsPricing.$inferInsert;
