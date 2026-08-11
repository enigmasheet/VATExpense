import { describe, it, expect } from "vitest";
import { calcFromTaxable, calcFromTotal, parseAmount } from "../ledger-calculation";

describe("calcFromTaxable", () => {
  it("calculates VAT and total from taxable", () => {
    const result = calcFromTaxable(1000);
    expect(result.vat).toBe(130);
    expect(result.total).toBe(1130);
  });

  it("handles zero", () => {
    const result = calcFromTaxable(0);
    expect(result.vat).toBe(0);
    expect(result.total).toBe(0);
  });

  it("rounds correctly", () => {
    const result = calcFromTaxable(99.99);
    expect(result.vat).toBe(13);
    expect(result.total).toBe(112.99);
  });

  it("handles small amounts", () => {
    const result = calcFromTaxable(1);
    expect(result.vat).toBe(0.13);
    expect(result.total).toBe(1.13);
  });
});

describe("calcFromTotal", () => {
  it("derives taxable and VAT from total", () => {
    const result = calcFromTotal(1130);
    expect(result.taxable).toBe(1000);
    expect(result.vat).toBe(130);
  });

  it("handles zero", () => {
    const result = calcFromTotal(0);
    expect(result.taxable).toBe(0);
    expect(result.vat).toBe(0);
  });

  it("rounds correctly", () => {
    const result = calcFromTotal(100);
    expect(result.taxable).toBe(88.5);
    expect(result.vat).toBe(11.5);
  });
});

describe("parseAmount", () => {
  it("returns empty for empty string", () => {
    const result = parseAmount("");
    expect(result.empty).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("returns invalid for non-numeric", () => {
    const result = parseAmount("abc");
    expect(result.valid).toBe(false);
    expect(result.empty).toBe(false);
  });

  it("returns zero for '0'", () => {
    const result = parseAmount("0");
    expect(result.zero).toBe(true);
    expect(result.valid).toBe(true);
  });

  it("returns negative for negative value", () => {
    const result = parseAmount("-5");
    expect(result.negative).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(-5);
  });

  it("returns valid for positive number", () => {
    const result = parseAmount("100.50");
    expect(result.valid).toBe(true);
    expect(result.value).toBe(100.5);
  });

  it("returns empty for whitespace only", () => {
    const result = parseAmount("  ");
    expect(result.empty).toBe(true);
    expect(result.valid).toBe(false);
  });
});
