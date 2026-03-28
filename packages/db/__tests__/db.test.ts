import { describe, it, expect } from "vitest";
import * as schema from "../src/schema";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Helper to recursively get all .ts files in a directory
function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("@pmg/db schema exports", () => {
  // Existing tables that should still be exported
  it("exports awsPricing table", () => {
    expect(schema.awsPricing).toBeDefined();
  });

  // Deleted tables should NOT be exported
  it("does NOT export tesLeads", () => {
    expect((schema as Record<string, unknown>).tesLeads).toBeUndefined();
  });

  it("does NOT export pmgLeads", () => {
    expect((schema as Record<string, unknown>).pmgLeads).toBeUndefined();
  });

  it("does NOT export awsMessages", () => {
    expect((schema as Record<string, unknown>).awsMessages).toBeUndefined();
  });

  it("does NOT export awsBookings", () => {
    expect((schema as Record<string, unknown>).awsBookings).toBeUndefined();
  });

  it("does not export connection_test", () => {
    expect((schema as Record<string, unknown>).connection_test).toBeUndefined();
  });

  // No imports of deleted files anywhere in the codebase
  it("no file imports from tes.ts or pmg.ts", () => {
    const srcDir = join(__dirname, "../src");
    const files = getAllTsFiles(srcDir);
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      expect(content, `${file} should not import from tes.ts`).not.toMatch(/from ['"].*\/tes['"]/);
      expect(content, `${file} should not import from pmg.ts`).not.toMatch(/from ['"].*\/pmg['"]/);
    }
  });

  it("no file imports aws messages or bookings", () => {
    const srcDir = join(__dirname, "../src");
    const files = getAllTsFiles(srcDir);
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      expect(content, `${file} should not reference awsMessages`).not.toMatch(/awsMessages/);
      expect(content, `${file} should not reference awsBookings`).not.toMatch(/awsBookings/);
    }
  });
});
