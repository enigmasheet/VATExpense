import { describe, it, expect } from "vitest";
import { getFiscalYearFromMiti, buildDuplicateIndex, validateLedgerRow, getFixableAction } from "../ledger-validation";
import type { LedgerRow } from "../ledger-types";
import { createLedgerRow } from "../ledger-utils";

describe("getFiscalYearFromMiti", () => {
  it("returns fiscal year name for valid miti", () => {
    const result = getFiscalYearFromMiti("2080-04-01");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fiscalYearName).toBe("2080/81");
    }
  });

  it("returns error for invalid miti", () => {
    const result = getFiscalYearFromMiti("invalid");
    expect(result.ok).toBe(false);
  });
});

describe("buildDuplicateIndex", () => {
  it("returns empty map for empty rows", () => {
    expect(buildDuplicateIndex([])).toEqual(new Map());
  });

  it("skips rows without invoiceNumber or partyId", () => {
    const rows = [createLedgerRow()];
    const index = buildDuplicateIndex(rows);
    expect(index.size).toBe(0);
  });

  it("counts same partyId+invoiceNumber across rows", () => {
    const row1 = createLedgerRow();
    row1.partyId = "p1";
    row1.invoiceNumber = "INV-001";
    const row2 = createLedgerRow();
    row2.partyId = "p1";
    row2.invoiceNumber = "INV-001";
    const index = buildDuplicateIndex([row1, row2]);
    expect(index.get("p1|inv-001")).toBe(2);
  });

  it("counts different invoice keys separately", () => {
    const row1 = createLedgerRow();
    row1.partyId = "p1";
    row1.invoiceNumber = "INV-001";
    const row2 = createLedgerRow();
    row2.partyId = "p1";
    row2.invoiceNumber = "INV-002";
    const index = buildDuplicateIndex([row1, row2]);
    expect(index.get("p1|inv-001")).toBe(1);
    expect(index.get("p1|inv-002")).toBe(1);
  });
});

describe("validateLedgerRow", () => {
  const emptyIndex = new Map<string, number>();
  const emptyInvoices = new Set<string>();

  function makeRow(overrides: Partial<LedgerRow> = {}): LedgerRow {
    return { ...createLedgerRow(), ...overrides };
  }

  it("returns incomplete when all fields empty", () => {
    const result = validateLedgerRow(makeRow({ miti: "" }), emptyIndex, emptyInvoices, "2080/81");
    expect(result.status).toBe("incomplete");
  });

  it("returns error when miti missing", () => {
    const result = validateLedgerRow(
      makeRow({ miti: "", partyId: "p1", partyResolved: true, taxableAmount: "100" }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("error");
    expect(result.error).toBe("Miti required");
  });

  it("returns error for invalid miti", () => {
    const result = validateLedgerRow(
      makeRow({ miti: "invalid", partyId: "p1", partyResolved: true, taxableAmount: "100" }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("error");
    expect(result.error).toBe("Invalid date");
  });

  it("returns error when miti falls in different FY", () => {
    const result = validateLedgerRow(
      makeRow({ miti: "2079-06-15", partyId: "p1", partyResolved: true, taxableAmount: "100" }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Date falls in FY");
  });

  it("returns error when party not resolved", () => {
    const result = validateLedgerRow(
      makeRow({ miti: "2080-04-01", taxableAmount: "100" }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("error");
    expect(result.error).toBe("Select a valid party");
  });

  it("returns error when invoice number missing", () => {
    const result = validateLedgerRow(
      makeRow({ miti: "2080-04-01", partyId: "p1", partyResolved: true, taxableAmount: "100" }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("error");
    expect(result.error).toBe("Invoice number required");
  });

  it("returns error when category missing", () => {
    const result = validateLedgerRow(
      makeRow({
        miti: "2080-04-01",
        partyId: "p1",
        partyResolved: true,
        invoiceNumber: "INV-001",
        taxableAmount: "100",
      }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("error");
    expect(result.error).toBe("Category required");
  });

  it("returns error when taxable amount is zero", () => {
    const result = validateLedgerRow(
      makeRow({
        miti: "2080-04-01",
        partyId: "p1",
        partyResolved: true,
        invoiceNumber: "INV-001",
        categoryId: "cat-1",
        taxableAmount: "0",
      }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Taxable amount");
  });

  it("returns error when invoice exists in DB", () => {
    const invoices = new Set(["p1|inv-001"]);
    const result = validateLedgerRow(
      makeRow({
        miti: "2080-04-01",
        partyId: "p1",
        partyResolved: true,
        invoiceNumber: "INV-001",
        categoryId: "cat-1",
        taxableAmount: "100",
      }),
      emptyIndex,
      invoices,
      "2080/81",
    );
    expect(result.status).toBe("duplicate");
    expect(result.error).toContain("already exists");
  });

  it("returns error for duplicate in batch", () => {
    const index = new Map([["p1|inv-001", 2]]);
    const result = validateLedgerRow(
      makeRow({
        miti: "2080-04-01",
        partyId: "p1",
        partyResolved: true,
        invoiceNumber: "INV-001",
        categoryId: "cat-1",
        taxableAmount: "100",
      }),
      index,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("duplicate");
    expect(result.error).toBe("Duplicate in batch");
  });

  it("returns pending when all fields valid", () => {
    const result = validateLedgerRow(
      makeRow({
        miti: "2080-04-01",
        partyId: "p1",
        partyResolved: true,
        invoiceNumber: "INV-001",
        categoryId: "cat-1",
        taxableAmount: "100",
      }),
      emptyIndex,
      emptyInvoices,
      "2080/81",
    );
    expect(result.status).toBe("pending");
    expect(result.error).toBeUndefined();
  });
});

describe("getFixableAction", () => {
  it("returns fillTodayMiti for Miti required", () => {
    const action = getFixableAction("Miti required");
    expect(action).not.toBeNull();
    expect(action!.fixType).toBe("fillTodayMiti");
    expect(action!.label).toBe("Fill today's date");
    expect(action!.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns fillTodayMiti for Invalid date", () => {
    const action = getFixableAction("Invalid date");
    expect(action).not.toBeNull();
    expect(action!.fixType).toBe("fillTodayMiti");
  });

  it("returns selectGeneralCategory for Category required", () => {
    const action = getFixableAction("Category required");
    expect(action).not.toBeNull();
    expect(action!.fixType).toBe("selectGeneralCategory");
    expect(action!.label).toBe("Select General");
    expect(action!.categoryName).toBe("General");
  });

  it("returns autoCreateFiscalYear for FY mismatch error", () => {
    const action = getFixableAction("Date falls in FY 2082/83 (not 2080/81)");
    expect(action).not.toBeNull();
    expect(action!.fixType).toBe("autoCreateFiscalYear");
    expect(action!.label).toBe("Create FY & fix");
  });

  it("returns null for non-fixable error", () => {
    expect(getFixableAction("Party not found")).toBeNull();
    expect(getFixableAction("Invoice number required")).toBeNull();
    expect(getFixableAction("Taxable amount must be greater than 0")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getFixableAction(undefined)).toBeNull();
  });
});
