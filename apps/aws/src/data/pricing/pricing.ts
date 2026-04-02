// import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
// import { sql } from "drizzle-orm";

// // ----------------------------------------------------------------------
// // 1. PACKAGES TABLE
// // Stores your service tiers (Identity, Profile, Growth)
// // ----------------------------------------------------------------------
// export const packages = sqliteTable("packages", {
//   // Using auto-increment integer for ID for simplicity
//   id: integer("id").primaryKey(),

//   // "Digital Identity", "Company Profile"
//   title: text("title").notNull(),

//   // "identity-pack" (Used for URL params)
//   slug: text("slug").notNull().unique(),

//   // "The Tender Starter Pack"
//   tagline: text("tagline"),

//   // Marketing description
//   description: text("description").notNull(),

//   // PRICING (Stored in CENTS)
//   // R99.00 -> 9900
//   monthlyPrice: integer("monthly_price").notNull(),
//   // R450.00 -> 45000
//   setupFee: integer("setup_fee").notNull(),

//   // FEATURES
//   // Storing as a JSON array string is efficient for D1/SQLite
//   // Usage: ["Domain", "Email", "SEO"]
//   features: text("features", { mode: "json" }).$type<string[]>().notNull(),

//   // UI FLAGS
//   isPopular: integer("is_popular", { mode: "boolean" }).default(false),
//   isActive: integer("is_active", { mode: "boolean" }).default(true),
// });

// // ----------------------------------------------------------------------
// // 2. LEADS TABLE
// // Captures clients interested in a specific package
// // ----------------------------------------------------------------------
// export const leads = sqliteTable("leads", {
//   id: integer("id").primaryKey(),

//   // Link to the package they want (Optional, in case they just ask a general question)
//   packageId: integer("package_id").references(() => packages.id),

//   // Client Details
//   name: text("name").notNull(),
//   companyName: text("company_name"), // Crucial for B2B/Tenders
//   email: text("email").notNull(),
//   phone: text("phone").notNull(), // WhatsApp number

//   // Lead Status Pipeline
//   status: text("status", {
//     enum: ["new", "contacted", "invoiced", "paid", "closed"],
//   }).default("new"),

//   createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
// });
