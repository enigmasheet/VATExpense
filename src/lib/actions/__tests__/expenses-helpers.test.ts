import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveFiscalYear, loadExpenseReferences, buildExpenseFingerprint } from "../expenses-helpers";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper
function mockChainReturn(rows: any[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper
function mockInsertReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.select).mockReturnValue(
      mockChainReturn([{ id: "fy-1", name: "2082-2083", companyId: "comp-1" }]) as any,
    );
    const result = await resolveFiscalYear("comp-1", "01/01/2083");
    expect("fiscalYearId" in result).toBe(true);
    if ("fiscalYearId" in result) expect(result.fiscalYearId).toBe("fy-1");
  });

  it("auto-creates FY if not found", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.insert).mockReturnValue(
      mockInsertReturn([{ id: "fy-new", name: "2082-2083", startYear: 2082, endYear: 2083, isActive: false }]) as any,
    );
    const result = await resolveFiscalYear("comp-1", "01/01/2083");
    expect("fiscalYearId" in result).toBe(true);
    if ("fiscalYearId" in result) {
      expect(result.fiscalYearId).toBe("fy-new");
      expect(result.fiscalYear.isActive).toBe(false);
    }
  });
});

describe("loadExpenseReferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when fiscal year not found by ID", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as any);
    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as any,
      "13.00",
    );
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Fiscal year");
  });

  it("returns error when party not found", async () => {
    const mockFY = [{ id: "fy-1", companyId: "comp-1" }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as any)   // FY lookup
      .mockReturnValueOnce(mockChainReturn([]) as any);       // Party lookup
    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as any,
      "13.00",
    );
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Party");
  });

  it("returns context with auto-resolved FY when no fiscalYearId provided", async () => {
    const mockFY = [{ id: "fy-auto", name: "2082-2083", companyId: "comp-1" }];
    const mockParty = [{ id: "p-1", companyId: "comp-1", name: "Test Party" }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as any)   // resolveFiscalYear lookup
      .mockReturnValueOnce(mockChainReturn(mockParty) as any); // party lookup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockFY) as any);

    const result = await loadExpenseReferences(
      "comp-1",
      { partyId: "p-1", miti: "01/01/2083", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as any,
      "13.00",
    );
    expect("context" in result).toBe(true);
  });

  it("uses defaultVatRate when input vatRate is null", async () => {
    const mockFY = [{ id: "fy-1", companyId: "comp-1" }];
    const mockParty = [{ id: "p-1", companyId: "comp-1" }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as any)
      .mockReturnValueOnce(mockChainReturn(mockParty) as any);

    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", vatRate: null, taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as any,
      "15.00",
    );
    expect("context" in result).toBe(true);
    if ("context" in result) expect(result.context.vatRate).toBe("15.00");
  });

  it("uses input vatRate over default", async () => {
    const mockFY = [{ id: "fy-1", companyId: "comp-1" }];
    const mockParty = [{ id: "p-1", companyId: "comp-1" }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn(mockFY) as any)
      .mockReturnValueOnce(mockChainReturn(mockParty) as any);

    const result = await loadExpenseReferences(
      "comp-1",
      { fiscalYearId: "fy-1", partyId: "p-1", miti: "01/01/2083", vatRate: "13.00", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" } as any,
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
    } as any;
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
    } as any;
    const fp = buildExpenseFingerprint("comp-1", data, "fy-1");
    expect(fp.invoiceNumber).toBeNull();
  });
});
