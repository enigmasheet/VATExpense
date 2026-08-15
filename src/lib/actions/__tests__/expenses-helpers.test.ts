import { describe, it, expect, vi } from "vitest";

// Mock DB at the top level before any imports that use it
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { buildExpenseFingerprint } from "../expenses-helpers";
import type { ExpenseInput } from "@/lib/validation/expense";

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const FY_ID = "550e8400-e29b-41d4-a716-446655440001";
const PARTY_ID = "550e8400-e29b-41d4-a716-446655440002";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";

function makeInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    companyId: COMPANY_ID,
    fiscalYearId: FY_ID,
    partyId: PARTY_ID,
    categoryId: CATEGORY_ID,
    miti: "2080-04-15",
    item: "Diesel",
    taxableAmount: "1000",
    vatAmount: "130",
    totalAmount: "1130",
    ...overrides,
  };
}

describe("buildExpenseFingerprint", () => {
  it("returns deterministic output for same inputs", () => {
    const input = makeInput();
    const fp1 = buildExpenseFingerprint(COMPANY_ID, input, FY_ID);
    const fp2 = buildExpenseFingerprint(COMPANY_ID, input, FY_ID);
    expect(fp1).toEqual(fp2);
  });

  it("produces different fingerprint for different partyId", () => {
    const input1 = makeInput({ partyId: PARTY_ID });
    const input2 = makeInput({ partyId: "660e8400-e29b-41d4-a716-446655440099" });
    const fp1 = buildExpenseFingerprint(COMPANY_ID, input1, FY_ID);
    const fp2 = buildExpenseFingerprint(COMPANY_ID, input2, FY_ID);
    expect(fp1.partyId).not.toBe(fp2.partyId);
  });

  it("produces different fingerprint for different taxableAmount", () => {
    const input1 = makeInput({ taxableAmount: "1000" });
    const input2 = makeInput({ taxableAmount: "2000" });
    const fp1 = buildExpenseFingerprint(COMPANY_ID, input1, FY_ID);
    const fp2 = buildExpenseFingerprint(COMPANY_ID, input2, FY_ID);
    expect(fp1.taxableAmount).not.toBe(fp2.taxableAmount);
  });

  it("sets invoiceNumber to null when undefined", () => {
    const input = makeInput({ invoiceNumber: undefined });
    const fp = buildExpenseFingerprint(COMPANY_ID, input, FY_ID);
    expect(fp.invoiceNumber).toBeNull();
  });

  it("sets invoiceNumber to null when null", () => {
    const input = makeInput({ invoiceNumber: null });
    const fp = buildExpenseFingerprint(COMPANY_ID, input, FY_ID);
    expect(fp.invoiceNumber).toBeNull();
  });

  it("includes companyId in fingerprint", () => {
    const input = makeInput();
    const fp = buildExpenseFingerprint(COMPANY_ID, input, FY_ID);
    expect(fp.companyId).toBe(COMPANY_ID);
  });

  it("includes all required fields", () => {
    const input = makeInput({ invoiceNumber: "INV-001" });
    const fp = buildExpenseFingerprint(COMPANY_ID, input, FY_ID);
    expect(fp).toHaveProperty("companyId");
    expect(fp).toHaveProperty("fiscalYearId");
    expect(fp).toHaveProperty("partyId");
    expect(fp).toHaveProperty("invoiceNumber");
    expect(fp).toHaveProperty("miti");
    expect(fp).toHaveProperty("taxableAmount");
    expect(fp).toHaveProperty("vatAmount");
    expect(fp).toHaveProperty("totalAmount");
  });

  it("preserves invoiceNumber when provided", () => {
    const input = makeInput({ invoiceNumber: "INV-001" });
    const fp = buildExpenseFingerprint(COMPANY_ID, input, FY_ID);
    expect(fp.invoiceNumber).toBe("INV-001");
  });
});
