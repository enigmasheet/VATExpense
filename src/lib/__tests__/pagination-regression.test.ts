import { describe, it, expect } from "vitest";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

describe("pagination regression protection", () => {
  describe("constants", () => {
    it("DEFAULT_PAGE_SIZE is 50", () => {
      expect(DEFAULT_PAGE_SIZE).toBe(50);
    });

    it("MAX_PAGE_SIZE is 200", () => {
      expect(MAX_PAGE_SIZE).toBe(200);
    });
  });

  describe("page validation logic", () => {
    // Replicate the pagination logic from expenses/route.ts
    function validatePage(raw: string | null): number {
      const rawPage = Number(raw ?? "1");
      return Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    }

    it("defaults to page 1 for null input", () => {
      expect(validatePage(null)).toBe(1);
    });

    it("defaults to page 1 for page=0", () => {
      expect(validatePage("0")).toBe(1);
    });

    it("defaults to page 1 for negative page", () => {
      expect(validatePage("-5")).toBe(1);
    });

    it("defaults to page 1 for NaN input", () => {
      expect(validatePage("abc")).toBe(1);
    });

    it("floors decimal page to integer", () => {
      expect(validatePage("1.7")).toBe(1);
    });

    it("accepts valid page number", () => {
      expect(validatePage("5")).toBe(5);
    });
  });

  describe("pageSize validation logic", () => {
    function validatePageSize(raw: string | null): number {
      const rawPageSize = Number(raw ?? String(DEFAULT_PAGE_SIZE));
      return Math.min(
        MAX_PAGE_SIZE,
        Number.isFinite(rawPageSize) && rawPageSize >= 1 ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE,
      );
    }

    it("defaults to DEFAULT_PAGE_SIZE for null input", () => {
      expect(validatePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    });

    it("defaults to DEFAULT_PAGE_SIZE for pageSize=0", () => {
      expect(validatePageSize("0")).toBe(DEFAULT_PAGE_SIZE);
    });

    it("defaults to DEFAULT_PAGE_SIZE for negative pageSize", () => {
      expect(validatePageSize("-5")).toBe(DEFAULT_PAGE_SIZE);
    });

    it("caps to MAX_PAGE_SIZE when exceeded", () => {
      expect(validatePageSize("999")).toBe(MAX_PAGE_SIZE);
    });

    it("floors decimal pageSize to integer", () => {
      expect(validatePageSize("55.9")).toBe(55);
    });

    it("accepts valid pageSize", () => {
      expect(validatePageSize("25")).toBe(25);
    });

    it("accepts pageSize equal to MAX_PAGE_SIZE", () => {
      expect(validatePageSize("200")).toBe(200);
    });
  });

  describe("offset calculation", () => {
    it("computes correct offset for page 1", () => {
      const page = 1;
      const pageSize = 50;
      expect((page - 1) * pageSize).toBe(0);
    });

    it("computes correct offset for page 2", () => {
      const page = 2;
      const pageSize = 50;
      expect((page - 1) * pageSize).toBe(50);
    });

    it("computes correct offset for large page", () => {
      const page = 999999;
      const pageSize = 50;
      expect((page - 1) * pageSize).toBe(49999900);
    });
  });
});
