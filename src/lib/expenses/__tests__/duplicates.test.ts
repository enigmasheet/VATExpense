import { describe, it, expect, vi } from "vitest";
import { checkInvoiceDuplicate, findSuspiciousDuplicates, type ExpenseFingerprint } from "../duplicates";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";

function makeFingerprint(overrides: Partial<ExpenseFingerprint> = {}): ExpenseFingerprint {
  return {
    companyId: "comp-1",
    fiscalYearId: "fy-1",
    partyId: "p1",
    invoiceNumber: "INV-001",
    miti: "2080-04-01",
    taxableAmount: "1000",
    vatAmount: "130",
    totalAmount: "1130",
    ...overrides,
  };
}

function mockSelectReturn(rows: any[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as any);
}

describe("checkInvoiceDuplicate", () => {
  it("returns null when no invoice number", async () => {
    const result = await checkInvoiceDuplicate(makeFingerprint({ invoiceNumber: null }));
    expect(result).toBeNull();
  });

  it("returns null when no matching rows", async () => {
    mockSelectReturn([]);
    const result = await checkInvoiceDuplicate(makeFingerprint());
    expect(result).toBeNull();
  });

  it("returns exact match when amounts and miti match", async () => {
    mockSelectReturn([{ miti: "2080-04-01", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" }]);
    const result = await checkInvoiceDuplicate(makeFingerprint());
    expect(result).not.toBeNull();
    expect(result!.level).toBe("exact");
  });

  it("returns invoice match when amounts differ", async () => {
    mockSelectReturn([{ miti: "2080-04-01", taxableAmount: "2000", vatAmount: "260", totalAmount: "2260" }]);
    const result = await checkInvoiceDuplicate(makeFingerprint());
    expect(result).not.toBeNull();
    expect(result!.level).toBe("invoice");
  });
});

describe("findSuspiciousDuplicates", () => {
  it("returns empty when invoice number is set", async () => {
    const result = await findSuspiciousDuplicates(makeFingerprint({ invoiceNumber: "INV-001" }));
    expect(result).toEqual([]);
  });

  it("returns candidates when amounts match", async () => {
    const existing = [
      { miti: "2080-04-01", taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" },
    ];
    mockSelectReturn(existing);
    const result = await findSuspiciousDuplicates(makeFingerprint({ invoiceNumber: null }));
    expect(result).toEqual(existing);
  });

  it("filters out candidates with different amounts", async () => {
    mockSelectReturn([
      { miti: "2080-04-01", taxableAmount: "5000", vatAmount: "650", totalAmount: "5650" },
    ]);
    const result = await findSuspiciousDuplicates(makeFingerprint({ invoiceNumber: null }));
    expect(result).toEqual([]);
  });
});
