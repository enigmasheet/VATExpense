import { describe, it, expect } from "vitest";
import { genRowId, normalizeInvoiceNumber, getInvoiceKey, createLedgerRow } from "../ledger-utils";

describe("genRowId", () => {
  it("returns unique IDs on successive calls", () => {
    const a = genRowId();
    const b = genRowId();
    expect(a).not.toBe(b);
  });

  it("returns a UUID format string", () => {
    const id = genRowId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("normalizeInvoiceNumber", () => {
  it("trims whitespace", () => {
    expect(normalizeInvoiceNumber("  INV-001  ")).toBe("inv-001");
  });

  it("returns unchanged if no whitespace", () => {
    expect(normalizeInvoiceNumber("INV001")).toBe("inv001");
  });
});

describe("getInvoiceKey", () => {
  it("combines partyId and normalized invoice", () => {
    expect(getInvoiceKey("party-1", "INV-001")).toBe("party-1|inv-001");
  });

  it("trims invoice number", () => {
    expect(getInvoiceKey("party-1", "  INV-001  ")).toBe("party-1|inv-001");
  });
});

describe("createLedgerRow", () => {
  it("creates an empty row with no arguments", () => {
    const row = createLedgerRow();
    expect(row.miti).toBe("");
    expect(row.partyId).toBe("");
    expect(row.status).toBe("incomplete");
    expect(row.id).toBeTruthy();
  });

  it("carries forward miti from previous row", () => {
    const prev = createLedgerRow();
    prev.miti = "2080-04-01";
    const next = createLedgerRow(prev);
    expect(next.miti).toBe("2080-04-01");
  });

  it("carries forward categoryId and categoryName", () => {
    const prev = createLedgerRow();
    prev.categoryId = "cat-1";
    prev.categoryName = "Office";
    const next = createLedgerRow(prev);
    expect(next.categoryId).toBe("cat-1");
    expect(next.categoryName).toBe("Office");
  });

  it("carries forward locationId and locationName", () => {
    const prev = createLedgerRow();
    prev.locationId = "loc-1";
    prev.locationName = "Kathmandu";
    const next = createLedgerRow(prev);
    expect(next.locationId).toBe("loc-1");
    expect(next.locationName).toBe("Kathmandu");
  });

  it("does NOT carry forward partyId/partyName", () => {
    const prev = createLedgerRow();
    prev.partyId = "party-1";
    prev.partyName = "Acme Corp";
    const next = createLedgerRow(prev);
    expect(next.partyId).toBe("");
    expect(next.partyName).toBe("");
  });

  it("does NOT carry forward invoiceNumber", () => {
    const prev = createLedgerRow();
    prev.invoiceNumber = "INV-001";
    const next = createLedgerRow(prev);
    expect(next.invoiceNumber).toBe("");
  });

  it("does NOT carry forward amounts", () => {
    const prev = createLedgerRow();
    prev.taxableAmount = "1000";
    prev.vatAmount = "130";
    prev.totalAmount = "1130";
    const next = createLedgerRow(prev);
    expect(next.taxableAmount).toBe("");
    expect(next.vatAmount).toBe("");
    expect(next.totalAmount).toBe("");
  });
});
