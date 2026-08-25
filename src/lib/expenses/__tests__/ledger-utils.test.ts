import { describe, it, expect } from "vitest";
import { genRowId, normalizeInvoiceNumber, getInvoiceKey, createLedgerRow, formatMitiInput, todayMiti } from "../ledger-utils";

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

describe("todayMiti", () => {
  it("returns a YYYY-MM-DD string", () => {
    const miti = todayMiti();
    expect(miti).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatMitiInput", () => {
  it("returns empty string for empty input", () => {
    expect(formatMitiInput("")).toBe("");
  });

  it("returns digits only when 4 or fewer", () => {
    expect(formatMitiInput("2083")).toBe("2083");
    expect(formatMitiInput("208")).toBe("208");
  });

  it("inserts first dash after 4 digits", () => {
    expect(formatMitiInput("20830")).toBe("2083-0");
    expect(formatMitiInput("208304")).toBe("2083-04");
  });

  it("inserts second dash after 6 digits", () => {
    expect(formatMitiInput("2083041")).toBe("2083-04-1");
    expect(formatMitiInput("20830415")).toBe("2083-04-15");
  });

  it("truncates to 8 digits", () => {
    expect(formatMitiInput("20830415")).toBe("2083-04-15");
    expect(formatMitiInput("208304151234")).toBe("2083-04-15");
  });

  it("strips non-digit characters", () => {
    expect(formatMitiInput("2083-04-15")).toBe("2083-04-15");
    expect(formatMitiInput("2083/04/15")).toBe("2083-04-15");
    expect(formatMitiInput("2083abcd0415")).toBe("2083-04-15");
  });

  it("handles partial input with existing dashes", () => {
    expect(formatMitiInput("2083-0")).toBe("2083-0");
    expect(formatMitiInput("2083-04-1")).toBe("2083-04-1");
  });
});

describe("normalizeInvoiceNumber", () => {
  it("trims whitespace", () => {
    expect(normalizeInvoiceNumber("  INV-001  ")).toBe("inv-001");
  });

  it("lowercases invoice number", () => {
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
  it("creates a row with today's miti when no arguments", () => {
    const row = createLedgerRow();
    expect(row.miti).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
