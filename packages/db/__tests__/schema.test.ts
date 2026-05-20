import { describe, it, expect } from "vitest";
import * as schema from "../src/schema";

describe("schema structure", () => {
  describe("barrel index exports", () => {
    // All 5 new domain tables exported
    it("exports divisions table", () => { expect(schema.divisions).toBeDefined(); });
    it("exports clients table", () => { expect(schema.clients).toBeDefined(); });
    it("exports income table", () => { expect(schema.income).toBeDefined(); });
    it("exports expenses table", () => { expect(schema.expenses).toBeDefined(); });
    it("exports leads table", () => { expect(schema.leads).toBeDefined(); });

    // Enums exported
    it("exports leadStatusEnum", () => { expect(schema.leadStatusEnum).toBeDefined(); });
    it("exports awsPackageTypeEnum", () => { expect(schema.awsPackageTypeEnum).toBeDefined(); });

    // Relations exported
    it("exports divisionsRelations", () => { expect(schema.divisionsRelations).toBeDefined(); });
    it("exports clientsRelations", () => { expect(schema.clientsRelations).toBeDefined(); });
    it("exports incomeRelations", () => { expect(schema.incomeRelations).toBeDefined(); });
    it("exports expensesRelations", () => { expect(schema.expensesRelations).toBeDefined(); });
    it("exports leadsRelations", () => { expect(schema.leadsRelations).toBeDefined(); });
  });

  describe("leadStatusEnum values", () => {
    it("contains exactly ['new', 'contacted', 'converted', 'lost']", () => {
      // pgEnum stores values in .enumValues
      expect(schema.leadStatusEnum.enumValues).toEqual(["new", "contacted", "converted", "lost"]);
    });
  });

  describe("awsPackageTypeEnum values", () => {
    it("contains exactly ['monthly', 'once_off']", () => {
      expect(schema.awsPackageTypeEnum.enumValues).toEqual(["monthly", "once_off"]);
    });
  });

  describe("leads table structure", () => {
    it("has a divisionId column", () => {
      // Drizzle table columns are accessible as properties on the table object
      expect((schema.leads as any).divisionId).toBeDefined();
    });

    it("divisionId is nullable (no notNull constraint)", () => {
      const divisionIdCol = (schema.leads as any).divisionId;
      // Drizzle column notNull property - nullable columns have notNull as false or undefined
      expect(divisionIdCol?.notNull).toBeFalsy();
    });
  });
});
