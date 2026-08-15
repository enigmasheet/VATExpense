import { describe, it, expect } from "vitest";
import {
  parseMiti,
  normalizeMiti,
  fyName,
  isValidMiti,
  SUPPORTED_MIN_BS_YEAR,
  SUPPORTED_MAX_BS_YEAR,
  FISCAL_YEAR_START_MONTH,
  NEPALI_MONTHS,
} from "@/lib/nepali-date";

describe("nepali-date regression protection", () => {
  describe("constants", () => {
    it("SUPPORTED_MIN_BS_YEAR is 2000", () => {
      expect(SUPPORTED_MIN_BS_YEAR).toBe(2000);
    });

    it("SUPPORTED_MAX_BS_YEAR is 2099", () => {
      expect(SUPPORTED_MAX_BS_YEAR).toBe(2099);
    });

    it("FISCAL_YEAR_START_MONTH is 4 (Shrawan)", () => {
      expect(FISCAL_YEAR_START_MONTH).toBe(4);
    });

    it("NEPALI_MONTHS has 12 entries", () => {
      expect(NEPALI_MONTHS).toHaveLength(12);
    });

    it("NEPALI_MONTHS starts with Baisakh", () => {
      expect(NEPALI_MONTHS[0]).toBe("Baisakh");
    });

    it("NEPALI_MONTHS ends with Chaitra", () => {
      expect(NEPALI_MONTHS[11]).toBe("Chaitra");
    });
  });

  describe("FY derivation", () => {
    it("Shrawan (month 4) belongs to current year FY", () => {
      const result = parseMiti("2080-04-15");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.fiscalYear).toBe(2080);
        expect(result.fiscalYearName).toBe("2080/81");
      }
    });

    it("Chaitra (month 12) belongs to current year FY", () => {
      const result = parseMiti("2080-12-15");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.fiscalYear).toBe(2080);
      }
    });

    it("Ashadh (month 3) belongs to previous year FY", () => {
      const result = parseMiti("2080-03-15");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.fiscalYear).toBe(2079);
        expect(result.fiscalYearName).toBe("2079/80");
      }
    });

    it("Baisakh (month 1) belongs to previous year FY", () => {
      const result = parseMiti("2080-01-15");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.fiscalYear).toBe(2079);
      }
    });

    it("Jestha (month 2) belongs to previous year FY", () => {
      const result = parseMiti("2080-02-15");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.fiscalYear).toBe(2079);
      }
    });
  });

  describe("fyName", () => {
    it("formats normal year correctly", () => {
      expect(fyName(2080)).toBe("2080/81");
    });

    it("formats year ending in 99", () => {
      expect(fyName(2079)).toBe("2079/80");
    });

    it("handles rollover at 99 producing 3-digit segment", () => {
      // year 2099: (2099 % 100) + 1 = 99 + 1 = 100
      expect(fyName(2099)).toBe("2099/100");
    });

    it("formats year 2000 correctly", () => {
      expect(fyName(2000)).toBe("2000/01");
    });
  });

  describe("format parsing", () => {
    it("accepts YYYY-MM-DD format", () => {
      const result = parseMiti("2080-04-15");
      expect(result.ok).toBe(true);
    });

    it("accepts DD/MM/YYYY format", () => {
      const result = parseMiti("15/04/2080");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.year).toBe(2080);
        expect(result.month).toBe(4);
        expect(result.day).toBe(15);
      }
    });

    it("rejects invalid format", () => {
      const result = parseMiti("invalid");
      expect(result.ok).toBe(false);
    });

    it("rejects format like MM-DD-YYYY", () => {
      const result = parseMiti("04-15-2080");
      expect(result.ok).toBe(false);
    });
  });

  describe("validation", () => {
    it("rejects year below minimum", () => {
      const result = parseMiti("1999-04-01");
      expect(result.ok).toBe(false);
    });

    it("rejects year above maximum", () => {
      const result = parseMiti("2100-01-01");
      expect(result.ok).toBe(false);
    });

    it("rejects month 0", () => {
      const result = parseMiti("2080-00-15");
      expect(result.ok).toBe(false);
    });

    it("rejects month 13", () => {
      const result = parseMiti("2080-13-01");
      expect(result.ok).toBe(false);
    });

    it("rejects day 0", () => {
      const result = parseMiti("2080-04-00");
      expect(result.ok).toBe(false);
    });

    it("rejects day exceeding days in month", () => {
      const result = parseMiti("2080-06-50");
      expect(result.ok).toBe(false);
    });
  });

  describe("isValidMiti", () => {
    it("returns true for valid date", () => {
      expect(isValidMiti("2080-04-15")).toBe(true);
    });

    it("returns false for invalid date", () => {
      expect(isValidMiti("invalid")).toBe(false);
    });

    it("returns false for out-of-range year", () => {
      expect(isValidMiti("1999-01-01")).toBe(false);
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
});
