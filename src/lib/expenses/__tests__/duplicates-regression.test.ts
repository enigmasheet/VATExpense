import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockChainReturn } from "@/lib/test-utils/mock-db";

// Mock DB at the top level before any imports that use it
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { amountsClose } from "@/lib/money";

describe("amountsClose regression protection", () => {
  it("returns true for identical numbers", () => {
    expect(amountsClose(100, 100)).toBe(true);
  });

  it("returns true for very close numbers (within 0.001)", () => {
    expect(amountsClose(100, 100.0005)).toBe(true);
  });

  it("returns false at exact boundary (0.001)", () => {
    expect(amountsClose(100, 100.001)).toBe(false);
  });

  it("returns true for zero base with close value", () => {
    expect(amountsClose(0, 0.0005)).toBe(true);
  });

  it("returns false for zero base at boundary", () => {
    expect(amountsClose(0, 0.001)).toBe(false);
  });

  it("is not symmetric for boundary values", () => {
    expect(amountsClose(0.001, 0)).toBe(false);
  });

  it("handles negative numbers", () => {
    expect(amountsClose(-100, -100.0005)).toBe(true);
    expect(amountsClose(-100, -100.001)).toBe(false);
  });
});

describe("checkInvoiceDuplicate regression protection", () => {
  let checkInvoiceDuplicate: typeof import("@/lib/expenses/duplicates").checkInvoiceDuplicate;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/expenses/duplicates");
    checkInvoiceDuplicate = mod.checkInvoiceDuplicate;
  });

  it("returns null when invoiceNumber is null (short-circuit)", async () => {
    const result = await checkInvoiceDuplicate({
      companyId: "c1",
      fiscalYearId: "fy1",
      partyId: "p1",
      invoiceNumber: null,
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    });
    expect(result).toBeNull();
  });

  it("returns null when no duplicate found", async () => {
    const chain = mockChainReturn([]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await checkInvoiceDuplicate({
      companyId: "c1",
      fiscalYearId: "fy1",
      partyId: "p1",
      invoiceNumber: "INV-001",
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    });
    expect(result).toBeNull();
  });

  it("returns 'exact' level when all fields match", async () => {
    const existing = {
      id: "e1",
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    };
    const chain = mockChainReturn([existing]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await checkInvoiceDuplicate({
      companyId: "c1",
      fiscalYearId: "fy1",
      partyId: "p1",
      invoiceNumber: "INV-001",
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("exact");
  });

  it("returns 'invoice' level when amounts differ", async () => {
    const existing = {
      id: "e1",
      miti: "2080-04-15",
      taxableAmount: "2000",
      vatAmount: "260",
      totalAmount: "2260",
    };
    const chain = mockChainReturn([existing]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await checkInvoiceDuplicate({
      companyId: "c1",
      fiscalYearId: "fy1",
      partyId: "p1",
      invoiceNumber: "INV-001",
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    });
    expect(result).not.toBeNull();
    expect(result!.level).toBe("invoice");
  });
});

describe("findSuspiciousDuplicates regression protection", () => {
  let findSuspiciousDuplicates: typeof import("@/lib/expenses/duplicates").findSuspiciousDuplicates;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/expenses/duplicates");
    findSuspiciousDuplicates = mod.findSuspiciousDuplicates;
  });

  it("returns empty array when invoiceNumber is present (skipped)", async () => {
    const result = await findSuspiciousDuplicates({
      companyId: "c1",
      fiscalYearId: "fy1",
      partyId: "p1",
      invoiceNumber: "INV-001",
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    });
    expect(result).toEqual([]);
  });

  it("returns matching candidates when amounts are close", async () => {
    const candidate = {
      id: "e1",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    };
    const chain = mockChainReturn([candidate]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await findSuspiciousDuplicates({
      companyId: "c1",
      fiscalYearId: "fy1",
      partyId: "p1",
      invoiceNumber: null,
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    });
    expect(result).toHaveLength(1);
  });

  it("filters out candidates with different amounts", async () => {
    const candidate = {
      id: "e1",
      taxableAmount: "5000",
      vatAmount: "650",
      totalAmount: "5650",
    };
    const chain = mockChainReturn([candidate]);
    vi.mocked(db.select).mockReturnValue(chain as never);

    const result = await findSuspiciousDuplicates({
      companyId: "c1",
      fiscalYearId: "fy1",
      partyId: "p1",
      invoiceNumber: null,
      miti: "2080-04-15",
      taxableAmount: "1000",
      vatAmount: "130",
      totalAmount: "1130",
    });
    expect(result).toEqual([]);
  });
});
