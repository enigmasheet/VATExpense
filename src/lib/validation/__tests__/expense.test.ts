import { describe, it, expect } from "vitest";
import { validateAmounts, expenseInputSchema } from "../expense";
import { safeParse } from "../utils";

describe("expenseInputSchema", () => {
  const validExpense = {
    companyId: "550e8400-e29b-41d4-a716-446655440000",
    fiscalYearId: "550e8400-e29b-41d4-a716-446655440001",
    partyId: "550e8400-e29b-41d4-a716-446655440002",
    categoryId: "550e8400-e29b-41d4-a716-446655440003",
    miti: "2080-04-01",
    item: "Office supplies",
    taxableAmount: "1000",
    vatAmount: "130",
    totalAmount: "1130",
    vatRate: "13",
  };

  it("accepts valid expense", () => {
    const result = expenseInputSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it("rejects missing item", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, item: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid miti format", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, miti: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("validateAmounts", () => {
  const base = {
    quantity: "10",
    rate: "100",
    taxableAmount: "1000",
    vatAmount: "130",
    totalAmount: "1130",
    vatRate: "13",
  };

  it("returns no warnings when all amounts are correct", () => {
    const warnings = validateAmounts(base);
    expect(warnings).toEqual([]);
  });

  it("warns when qty*rate differs significantly from taxable", () => {
    const warnings = validateAmounts({
      quantity: "10",
      rate: "100",
      taxableAmount: "2000",
      vatAmount: "260",
      totalAmount: "2260",
      vatRate: "13",
    });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Quantity × Rate");
  });

  it("warns when computed VAT differs significantly", () => {
    const warnings = validateAmounts({
      quantity: "10",
      rate: "100",
      taxableAmount: "1000",
      vatAmount: "260",
      totalAmount: "1260",
      vatRate: "13",
    });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Taxable × VAT rate");
  });

  it("warns when computed total differs significantly", () => {
    const warnings = validateAmounts({ ...base, totalAmount: "2000" });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Taxable + VAT");
  });

  it("warns for multiple mismatches", () => {
    const warnings = validateAmounts({
      ...base,
      vatAmount: "260",
      totalAmount: "2000",
    });
    expect(warnings.length).toBe(2);
  });

  it("does not warn within tolerance", () => {
    const warnings = validateAmounts({ ...base, totalAmount: "1132" });
    expect(warnings).toEqual([]);
  });

  it("warns when outside tolerance", () => {
    const warnings = validateAmounts({
      ...base,
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1150",
    });
    expect(warnings.length).toBeGreaterThan(0);
  });
});
