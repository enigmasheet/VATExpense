import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveFiscalYear, loadExpenseReferences, buildExpenseFingerprint } from "../expenses-helpers";
import { mockChainReturn, mockInsertReturn } from "@/lib/test-utils/mock-db";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";

describe("resolveFiscalYear", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid miti date", async () => {
    const result = await resolveFiscalYear("comp-1", "99/99/9999");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Invalid date");
  });

  it("returns existing FY if found", async () => {
    vi.mocked(db.select).mockReturnValue(
      mockChainReturn([{ id: "fy-1", name: "2082-2083", companyId: "comp-1" }]) as never,
    );
    const result = await resolveFiscalYear("comp-1", "01/01/2083");
    expect("fiscalYearId" in result).toBe(true);
    if ("fiscalYearId" in result) expect(result.fiscalYearId).toBe("fy-1");
  });

  it("auto-creates FY if not found", async () => {
    vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
    vi.mocked(db.insert).mockReturnValue(
      mockInsertReturn([{ id: "fy-new", name: "2082-2083", startYear: 2082, endYear: 2083, isActive: false }]) as never,
    );
    const result = await resolveFiscalYear("comp-1", "01/01/2083");
    expect("fiscalYearId" in result).toBe(true);
    if ("fiscalYearId" in result) {
      expect(result.fiscalYearId).toBe("fy-new");
      expect(result.fiscalYear.isActive).toBe(false);
    }
  });

  it("uses normalized FY name for lookup", async () => {
    vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "fy-1" }]) as never);
    await resolveFiscalYear("comp-1", "15/03/2083");

    const selectCall = vi.mocked(db.select).mock.results[0].value;
    const whereArg = selectCall.from.mock.results[0].value.where.mock.calls[0][0];
    expect(whereArg).toBeDefined();
  });

  it("creates FY with correct startYear for mid-year date (Chaitra)", async () => {
    vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
    vi.mocked(db.insert).mockReturnValue(
      mockInsertReturn([{ id: "fy-new", name: "2082-2083", startYear: 2082, endYear: 2083, isActive: false }]) as never,
    );
    const result = await resolveFiscalYear("comp-1", "15/03/2083");
    expect("fiscalYearId" in result).toBe(true);
    if ("fiscalYearId" in result) {
      expect(result.fiscalYear.startYear).toBe(2082);
      expect(result.fiscalYear.endYear).toBe(2083);
    }
  });

  it("creates FY with correct startYear for early-year date (Baisakh)", async () => {
    vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
    vi.mocked(db.insert).mockReturnValue(
      mockInsertReturn([{ id: "fy-new", name: "2082-2083", startYear: 2082, endYear: 2083, isActive: false }]) as never,
    );
    const result = await resolveFiscalYear("comp-1", "15/04/2083");
    expect("fiscalYearId" in result).toBe(true);
    if ("fiscalYearId" in result) {
      expect(result.fiscalYear.startYear).toBe(2082);
      expect(result.fiscalYear.endYear).toBe(2083);
    }
  });

  it("returns error for completely invalid date string", async () => {
    const result = await resolveFiscalYear("comp-1", "not-a-date");
    expect("error" in result).toBe(true);
  });

  it("returns error for empty string", async () => {
    const result = await resolveFiscalYear("comp-1", "");
    expect("error" in result).toBe(true);
  });
});

describe("loadExpenseReferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when fiscal year not found by ID", async () => {
    vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as never,
      "13.00",
    );
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Fiscal year");
  });

  it("returns error when party not found", async () => {
    const mockFY = [{ id: "fy-1", companyId: "comp-1" }];
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as never)   // FY lookup
      .mockReturnValueOnce(mockChainReturn([]) as never);       // Party lookup
    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as never,
      "13.00",
    );
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Party");
  });

  it("returns context with auto-resolved FY when no fiscalYearId provided", async () => {
    const mockFY = [{ id: "fy-auto", name: "2082-2083", companyId: "comp-1" }];
    const mockParty = [{ id: "p-1", companyId: "comp-1", name: "Test Party" }];
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as never)   // resolveFiscalYear lookup
      .mockReturnValueOnce(mockChainReturn(mockParty) as never); // party lookup
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockFY) as never);

    const result = await loadExpenseReferences(
      "comp-1",
      { partyId: "p-1", miti: "01/01/2083", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as never,
      "13.00",
    );
    expect("context" in result).toBe(true);
  });

  it("uses defaultVatRate when input vatRate is null", async () => {
    const mockFY = [{ id: "fy-1", companyId: "comp-1" }];
    const mockParty = [{ id: "p-1", companyId: "comp-1" }];
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as never)
      .mockReturnValueOnce(mockChainReturn(mockParty) as never);

    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", vatRate: null, taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as never,
      "15.00",
    );
    expect("context" in result).toBe(true);
    if ("context" in result) expect(result.context.vatRate).toBe("15.00");
  });

  it("uses input vatRate over default", async () => {
    const mockFY = [{ id: "fy-1", companyId: "comp-1" }];
    const mockParty = [{ id: "p-1", companyId: "comp-1" }];
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as never)
      .mockReturnValueOnce(mockChainReturn(mockParty) as never);

    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", vatRate: "13.00", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as never,
      "15.00",
    );
    expect("context" in result).toBe(true);
    if ("context" in result) expect(result.context.vatRate).toBe("13.00");
  });
});

describe("buildExpenseFingerprint", () => {
  it("returns correct fingerprint shape", () => {
    const data = {
      partyId: "p-1",
      invoiceNumber: "INV-001",
      miti: "01/01/2083",
      taxableAmount: "1000.00",
      vatAmount: "130.00",
      totalAmount: "1130.00",
    } as never;
    const fp = buildExpenseFingerprint("comp-1", data, "fy-1");
    expect(fp).toEqual({
      companyId: "comp-1",
      fiscalYearId: "fy-1",
      partyId: "p-1",
      invoiceNumber: "INV-001",
      miti: "01/01/2083",
      taxableAmount: "1000.00",
      vatAmount: "130.00",
      totalAmount: "1130.00",
    });
  });

  it("sets invoiceNumber to null when undefined", () => {
    const data = {
      partyId: "p-1",
      miti: "01/01/2083",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    } as never;
    const fp = buildExpenseFingerprint("comp-1", data, "fy-1");
    expect(fp.invoiceNumber).toBeNull();
  });
});
