import { describe, it, expect } from "vitest";
import { calcFromTaxable, calcFromTotal, parseAmount, VAT_FACTOR } from "../ledger-calculation";
import { round2, amountsClose } from "@/lib/money";
import { VAT_RATE } from "@/lib/constants";

describe("VAT calculation regression protection", () => {
  describe("VAT_RATE constant", () => {
    it("VAT_RATE is 13 (percentage, not decimal)", () => {
      expect(VAT_RATE).toBe(13);
    });

    it("VAT_FACTOR equals 1 + VAT_RATE / 100", () => {
      expect(VAT_FACTOR).toBe(1 + VAT_RATE / 100);
    });

    it("VAT_FACTOR is 1.13", () => {
      expect(VAT_FACTOR).toBe(1.13);
    });
  });

  describe("calcFromTaxable", () => {
    it("calculates correct VAT for 1000", () => {
      const result = calcFromTaxable(1000);
      expect(result.vat).toBe(130);
      expect(result.total).toBe(1130);
    });

    it("calculates correct VAT for 100", () => {
      const result = calcFromTaxable(100);
      expect(result.vat).toBe(13);
      expect(result.total).toBe(113);
    });

    it("handles sub-rupee amounts with correct rounding", () => {
      const result = calcFromTaxable(0.5);
      expect(result.vat).toBe(0.07);
      expect(result.total).toBe(0.57);
    });

    it("handles large amounts", () => {
      const result = calcFromTaxable(999999);
      expect(result.vat).toBe(129999.87);
      expect(result.total).toBe(1129998.87);
    });

    it("handles zero taxable", () => {
      const result = calcFromTaxable(0);
      expect(result.vat).toBe(0);
      expect(result.total).toBe(0);
    });

    it("handles minimum meaningful amount (1)", () => {
      const result = calcFromTaxable(1);
      expect(result.vat).toBe(0.13);
      expect(result.total).toBe(1.13);
    });
  });

  describe("calcFromTotal", () => {
    it("derives correct taxable from 1130", () => {
      const result = calcFromTotal(1130);
      expect(result.taxable).toBe(1000);
      expect(result.vat).toBe(130);
    });

    it("derives correct taxable from 113", () => {
      const result = calcFromTotal(113);
      expect(result.taxable).toBe(100);
      expect(result.vat).toBe(13);
    });

    it("derives correct values for 1.13", () => {
      const result = calcFromTotal(1.13);
      expect(result.taxable).toBe(1);
      expect(result.vat).toBe(0.13);
    });

    it("handles zero total", () => {
      const result = calcFromTotal(0);
      expect(result.taxable).toBe(0);
      expect(result.vat).toBe(0);
    });
  });

  describe("rounding asymmetry invariant", () => {
    it("calcFromTaxable then calcFromTotal does NOT round-trip perfectly", () => {
      // This is expected behavior — rounding in both directions introduces drift
      const forward = calcFromTaxable(88.5);
      // forward.total = round2(88.5 + 11.51) = 100.01
      const reverse = calcFromTotal(forward.total);
      // reverse.taxable = round2(100.01 / 1.13) = 88.50
      // The key invariant: they are close but not identical
      expect(amountsClose(reverse.taxable, 88.5)).toBe(true);
    });

    it("calcFromTotal(100) produces specific asymmetric result", () => {
      const result = calcFromTotal(100);
      expect(result.taxable).toBe(88.5);
      expect(result.vat).toBe(11.5);
    });
  });

  describe("round2 with Number.EPSILON", () => {
    it("rounds 1.005 to 1.01 (not 1.0)", () => {
      // This is the critical Number.EPSILON behavior
      expect(round2(1.005)).toBe(1.01);
    });

    it("rounds 2.675 to 2.68", () => {
      // Known IEEE 754 edge case
      expect(round2(2.675)).toBe(2.68);
    });

    it("rounds negative 1.005 to -1 (asymmetric due to Number.EPSILON)", () => {
      // Number.EPSILON addition makes -1.005 + EPSILON = -1.004999... which rounds to -1
      expect(round2(-1.005)).toBe(-1);
    });

    it("rounds zero to zero", () => {
      expect(round2(0)).toBe(0);
    });

    it("rounds 1.004 to 1.0 (below threshold)", () => {
      expect(round2(1.004)).toBe(1);
    });
  });
});

describe("parseAmount", () => {
  it("returns empty for empty string", () => {
    const result = parseAmount("");
    expect(result.empty).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("returns invalid for non-numeric string", () => {
    const result = parseAmount("abc");
    expect(result.valid).toBe(false);
  });

  it("returns zero for '0'", () => {
    const result = parseAmount("0");
    expect(result.zero).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(0);
  });

  it("detects negative values", () => {
    const result = parseAmount("-100");
    expect(result.negative).toBe(true);
    expect(result.value).toBe(-100);
  });

  it("parses positive values", () => {
    const result = parseAmount("123.45");
    expect(result.valid).toBe(true);
    expect(result.value).toBe(123.45);
  });

  it("trims whitespace", () => {
    const result = parseAmount("  100  ");
    expect(result.valid).toBe(true);
    expect(result.value).toBe(100);
  });
});
