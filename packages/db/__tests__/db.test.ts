import { describe, it, expect } from "vitest";
import { db } from "../src/client";
import { connection_test } from "../src/schema";

describe("Database package tests", () => {
  it("should define connection_test correctly", () => {
    // A simple sanity check that our schema is defined
    expect(connection_test).toBeDefined();
    expect(connection_test).toHaveProperty("id");
    expect(connection_test).toHaveProperty("message");
    expect(connection_test).toHaveProperty("createdAt");
  });
  
  it("should have a valid db client exported", () => {
    expect(db).toBeDefined();
  });
});
