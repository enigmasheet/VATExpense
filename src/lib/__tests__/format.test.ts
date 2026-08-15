import { describe, it, expect } from "vitest";
import { nepaliGroupedNumber, formatAmount, formatDate } from "../format";

describe("nepaliGroupedNumber", () => {
  it("formats small numbers without grouping", () => {
    expect(nepaliGroupedNumber(456)).toBe("456.00");
  });

  it("formats thousands with comma grouping", () => {
    expect(nepaliGroupedNumber(1234)).toBe("1,234.00");
  });

  it("formats lakhs in Nepali grouping style", () => {
    expect(nepaliGroupedNumber(855706)).toBe("8,55,706.00");
  });

  it("formats crores in Nepali grouping style", () => {
    expect(nepaliGroupedNumber(12345678)).toBe("1,23,45,678.00");
  });

  it("handles negative numbers", () => {
    expect(nepaliGroupedNumber(-1234)).toBe("-1,234.00");
  });

  it("handles zero", () => {
    expect(nepaliGroupedNumber(0)).toBe("0.00");
  });

  it("handles exactly 1000", () => {
    expect(nepaliGroupedNumber(1000)).toBe("1,000.00");
  });

  it("handles exactly 100000 (one lakh)", () => {
    expect(nepaliGroupedNumber(100000)).toBe("1,00,000.00");
  });

  it("handles 10000000 (one crore)", () => {
    expect(nepaliGroupedNumber(10000000)).toBe("1,00,00,000.00");
  });
});

describe("formatAmount", () => {
  it("formats valid number with Rs. prefix", () => {
    expect(formatAmount("1234")).toBe("Rs. 1,234.00");
  });

  it("returns dash for null", () => {
    expect(formatAmount(null)).toBe("\u2013");
  });

  it("returns dash for undefined", () => {
    expect(formatAmount(undefined)).toBe("\u2013");
  });

  it("returns dash for empty string", () => {
    expect(formatAmount("")).toBe("\u2013");
  });

  it("formats negative numbers", () => {
    expect(formatAmount("-1234")).toBe("Rs. -1,234.00");
  });

  it("formats zero", () => {
    expect(formatAmount("0")).toBe("Rs. 0.00");
  });

  it("handles numeric input", () => {
    expect(formatAmount(1234)).toBe("Rs. 1,234.00");
  });
});

describe("formatDate", () => {
  it("formats valid Date object", () => {
    const result = formatDate(new Date("2026-01-15T00:00:00Z"));
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("returns dash for null", () => {
    expect(formatDate(null)).toBe("\u2013");
  });

  it("returns dash for undefined", () => {
    expect(formatDate(undefined)).toBe("\u2013");
  });

  it("formats valid ISO string", () => {
    const result = formatDate("2026-06-15T00:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});
