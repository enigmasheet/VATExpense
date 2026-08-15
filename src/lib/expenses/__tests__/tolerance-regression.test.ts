import { describe, it, expect } from "vitest";
import { validateAmounts } from "@/lib/validation/expense";
import { MIN_AMOUNT_TOLERANCE, AMOUNT_TOLERANCE_RATIO } from "@/lib/constants";

describe("tolerance regression protection", () => {
  describe("constants", () => {
    it("MIN_AMOUNT_TOLERANCE is 1.0", () => {
      expect(MIN_AMOUNT_TOLERANCE).toBe(1.0);
    });

    it("AMOUNT_TOLERANCE_RATIO is 0.005", () => {
      expect(AMOUNT_TOLERANCE_RATIO).toBe(0.005);
    });
  });

  describe("tolerance calculation", () => {
    it("returns no warnings when all amounts are correct", () => {
      const warnings = validateAmounts({
        quantity: "10",
        rate: "100",
        taxableAmount: "1000",
        vatAmount: "130",
        totalAmount: "1130",
        vatRate: "13",
      });
      expect(warnings).toEqual([]);
    });

    it("returns no warnings when mismatch within tolerance", () => {
      // tolerance = max(1.00, 1000 * 0.005) = max(1.00, 5.00) = 5.00
      // totalAmount 1132 differs from 1130 by 2, which is < 5.00
      const warnings = validateAmounts({
        quantity: "10",
        rate: "100",
        taxableAmount: "1000",
        vatAmount: "130",
        totalAmount: "1132",
        vatRate: "13",
      });
      expect(warnings).toEqual([]);
    });

    it("warns when mismatch exceeds tolerance", () => {
      // tolerance = max(1.00, 1000 * 0.005) = 5.00
      // totalAmount 1150 differs from 1130 by 20, which is > 5.00
      const warnings = validateAmounts({
        quantity: "10",
        rate: "100",
        taxableAmount: "1000",
        vatAmount: "130",
        totalAmount: "1150",
        vatRate: "13",
      });
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain("Taxable + VAT");
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

    it("skips qty*rate check when quantity is null", () => {
      const warnings = validateAmounts({
        quantity: null,
        rate: "100",
        taxableAmount: "1000",
        vatAmount: "130",
        totalAmount: "1130",
        vatRate: "13",
      });
      expect(warnings).toEqual([]);
    });

    it("skips qty*rate check when rate is undefined", () => {
      const warnings = validateAmounts({
        quantity: "10",
        rate: undefined,
        taxableAmount: "1000",
        vatAmount: "130",
        totalAmount: "1130",
        vatRate: "13",
      });
      expect(warnings).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("zero taxable uses minimum tolerance of 1.00", () => {
      // tolerance = max(1.00, 0 * 0.005) = 1.00
      // computedVat = round2(0 * 13 / 100) = 0
      // vatAmount 5 differs from computed 0 by 5, which is > 1.00 → warning
      // computedTotal = round2(0 + 5) = 5, totalAmount 5 → no warning
      const warnings = validateAmounts({
        quantity: null,
        rate: null,
        taxableAmount: "0",
        vatAmount: "5",
        totalAmount: "5",
        vatRate: "13",
      });
      expect(warnings.length).toBe(1); // only vat mismatch
      expect(warnings[0]).toContain("Taxable × VAT rate");
    });

    it("small taxable (0.50) uses minimum tolerance of 1.00", () => {
      // tolerance = max(1.00, 0.50 * 0.005) = max(1.00, 0.0025) = 1.00
      // vatAmount 0.07 vs computed 0.07 — within tolerance
      const warnings = validateAmounts({
        quantity: null,
        rate: null,
        taxableAmount: "0.50",
        vatAmount: "0.07",
        totalAmount: "0.57",
        vatRate: "13",
      });
      expect(warnings).toEqual([]);
    });

    it("large taxable (100000) uses ratio-based tolerance of 500", () => {
      // tolerance = max(1.00, 100000 * 0.005) = 500
      // computedVat = round2(100000 * 13 / 100) = 13000
      // computedTotal = round2(100000 + 13000) = 113000
      // totalAmount 113400 differs from 113000 by 400, which is < 500
      const warnings = validateAmounts({
        quantity: null,
        rate: null,
        taxableAmount: "100000",
        vatAmount: "13000",
        totalAmount: "113400",
        vatRate: "13",
      });
      expect(warnings).toEqual([]);
    });

    it("warns for multiple mismatches", () => {
      const warnings = validateAmounts({
        quantity: "10",
        rate: "100",
        taxableAmount: "1000",
        vatAmount: "260",
        totalAmount: "2000",
        vatRate: "13",
      });
      expect(warnings.length).toBe(2);
    });
  });
});
