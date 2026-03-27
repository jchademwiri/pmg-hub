import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const connection_test = pgTable("connection_test", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
