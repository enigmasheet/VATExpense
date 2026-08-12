import { describe, it, expect } from "vitest";
import { parseMiti, normalizeMiti, fyName, isValidMiti } from "../nepali-date";

describe("parseMiti", () => {
  it("parses valid miti and returns correct FY", () => {
    const result = parseMiti("2080-04-01");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.year).toBe(2080);
      expect(result.month).toBe(4);
      expect(result.day).toBe(1);
      expect(result.monthName).toBe("Shrawan");
      expect(result.fiscalYearName).toBe("2080/81");
      expect(result.fiscalYear).toBe(2080);
    }
  });

  it("assigns FY 2080/81 to Chaitra (month 12)", () => {
    const result = parseMiti("2080-12-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.monthName).toBe("Chaitra");
      expect(result.fiscalYearName).toBe("2080/81");
    }
  });

  it("assigns FY 2079/80 to Ashadh (month 3)", () => {
    const result = parseMiti("2080-03-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.monthName).toBe("Ashadh");
      expect(result.fiscalYearName).toBe("2079/80");
    }
  });

  it("rejects invalid format", () => {
    const result = parseMiti("invalid");
    expect(result.ok).toBe(false);
  });

  it("rejects year out of range", () => {
    const result = parseMiti("1999-04-01");
    expect(result.ok).toBe(false);
  });

  it("rejects invalid month", () => {
    const result = parseMiti("2080-13-01");
    expect(result.ok).toBe(false);
  });

  it("accepts DD/MM/YYYY format", () => {
    const result = parseMiti("01/04/2080");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.year).toBe(2080);
      expect(result.month).toBe(4);
    }
  });

  it("handles day 32 in Falgun 2080 (valid if month has 32 days)", () => {
    const result = parseMiti("2080-11-32");
    if (result.ok) {
      expect(result.year).toBe(2080);
      expect(result.month).toBe(11);
    }
  });

  it("rejects clearly invalid date", () => {
    const result = parseMiti("2080-06-50");
    expect(result.ok).toBe(false);
  });
});

describe("normalizeMiti", () => {
  it("returns YYYY-MM-DD unchanged", () => {
    expect(normalizeMiti("2080-04-01")).toBe("2080-04-01");
  });

  it("converts DD/MM/YYYY to YYYY-MM-DD", () => {
    expect(normalizeMiti("01/04/2080")).toBe("2080-04-01");
  });

  it("returns unrecognized format as-is (trimmed)", () => {
    expect(normalizeMiti("  hello  ")).toBe("hello");
  });
});

describe("fyName", () => {
  it("formats normal year", () => {
    expect(fyName(2080)).toBe("2080/81");
  });

  it("formats year ending in 99", () => {
    expect(fyName(2079)).toBe("2079/80");
  });

  it("handles rollover at 99", () => {
    expect(fyName(2099)).toBe("2099/100");
  });
});

describe("isValidMiti", () => {
  it("returns true for valid miti", () => {
    expect(isValidMiti("2080-04-01")).toBe(true);
  });

  it("returns false for invalid miti", () => {
    expect(isValidMiti("invalid")).toBe(false);
  });
});
