import { describe, it, expect } from "vitest";
import * as schema from "../src/schema";

describe("@pmg/db schema exports", () => {
  it("exports tesLeads table", () => {
    expect(schema.tesLeads).toBeDefined();
  });

  it("exports awsMessages table", () => {
    expect(schema.awsMessages).toBeDefined();
  });

  it("exports awsBookings table", () => {
    expect(schema.awsBookings).toBeDefined();
  });

  it("exports awsPricing table", () => {
    expect(schema.awsPricing).toBeDefined();
  });

  it("exports pmgLeads table", () => {
    expect(schema.pmgLeads).toBeDefined();
  });

  it("does not export connection_test", () => {
    expect((schema as Record<string, unknown>).connection_test).toBeUndefined();
  });
});
