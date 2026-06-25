// packages/db/src/recalculate-waterfall.ts
// One-off script: recalculates the waterfall for all existing scheduled tenders
// Orders by priority (urgent first), closing date, then creation date,
// then cascades them so each planned tender starts when the previous one ends.
import { config } from "dotenv";
import { resolve } from "path";
import { getDb } from "./client";
import { recalculateTenderWaterfall } from "./queries/tender-schedule";

config({ path: resolve(import.meta.dir, "../.env") });

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

// Force-init the db connection
const db = getDb();
console.log("✅ Database connected.");

console.log("🔄 Recalculating tender waterfall for all active scheduled tenders...");
console.log("   (planned + in_progress entries will be ordered and cascaded)");

const start = performance.now();
await recalculateTenderWaterfall();
const elapsed = ((performance.now() - start) / 1000).toFixed(2);

console.log(`✅ Waterfall recalculation complete in ${elapsed}s.`);

// Verify by fetching the updated entries
const { tenderScheduleEntries, asc, sql } = await import("drizzle-orm");
const entries = await db
  .select({
    id: tenderScheduleEntries.id,
    tenderReference: tenderScheduleEntries.tenderReference,
    status: tenderScheduleEntries.status,
    priority: tenderScheduleEntries.priority,
    closingDate: tenderScheduleEntries.closingDate,
    sortOrder: tenderScheduleEntries.sortOrder,
    startDate: tenderScheduleEntries.startDate,
    targetCompletionDate: tenderScheduleEntries.targetCompletionDate,
  })
  .from(tenderScheduleEntries)
  .where(
    sql`${tenderScheduleEntries.status}::text = ANY(ARRAY['planned', 'in_progress'])`,
  )
  .orderBy(asc(tenderScheduleEntries.sortOrder));

console.log(`\n📋 Updated ${entries.length} active entries:`);
for (const entry of entries) {
  console.log(
    `  #${entry.sortOrder} [${entry.status}] ${entry.priority.padEnd(6)} ${entry.tenderReference.padEnd(30)} ` +
    `closing: ${entry.closingDate}  start: ${entry.startDate}  target: ${entry.targetCompletionDate}`,
  );
}

process.exit(0);
