import { describe, it, expect } from "vitest";
import { normalizeName, normalizeVatNumber } from "../normalize";

describe("normalizeName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeName("  Hello   World  ")).toBe("HELLO WORLD");
  });

  it("strips periods and commas", () => {
    expect(normalizeName("ABC, DEF.")).toBe("ABC DEF");
  });

  it("strips multiple punctuation", () => {
    expect(normalizeName("a..b,,c")).toBe("ABC");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
  });

  it("uppercases", () => {
    expect(normalizeName("test")).toBe("TEST");
  });

  it("two names differing only by case/punctuation produce same result", () => {
    expect(normalizeName("Of,fice.")).toBe(normalizeName("Office"));
  });

  it("preserves internal single spaces", () => {
    expect(normalizeName("New  York")).toBe("NEW YORK");
  });
});

describe("normalizeVatNumber", () => {
  it("strips non-digit characters", () => {
    expect(normalizeVatNumber("VAT-1234-5678")).toBe("12345678");
  });

  it("strips spaces", () => {
    expect(normalizeVatNumber(" 12 34 ")).toBe("1234");
  });

  it("returns null for null", () => {
    expect(normalizeVatNumber(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeVatNumber(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeVatNumber("")).toBeNull();
  });

  it("returns null for all non-digits", () => {
    expect(normalizeVatNumber("abc")).toBeNull();
  });

  it("handles mixed alphanumeric", () => {
    expect(normalizeVatNumber("PAN12345A")).toBe("12345");
  });
});
