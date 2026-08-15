import { describe, it, expect } from "vitest";
import { normalizeName, normalizeVatNumber, levenshteinDistance, findSimilarNames } from "../normalize";

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

  it("preserves ampersand and special characters", () => {
    expect(normalizeName("A & B Co.")).toBe("A & B CO");
  });

  it("preserves apostrophes", () => {
    expect(normalizeName("O'Brien")).toBe("O'BRIEN");
  });

  it("strips only periods and commas, not other punctuation", () => {
    expect(normalizeName("Test: Value; Here")).toBe("TEST: VALUE; HERE");
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

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("abc", "abc")).toBe(0);
  });

  it("returns correct distance for single substitution", () => {
    expect(levenshteinDistance("kitten", "sitten")).toBe(1);
  });

  it("returns correct distance for insertion and deletion", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("returns n when first string is empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
  });

  it("returns 0 when both strings are empty", () => {
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("is case sensitive", () => {
    expect(levenshteinDistance("ABC", "abc")).toBe(3);
  });
});

describe("findSimilarNames", () => {
  it("returns empty array when exact match found (distance 0 excluded)", () => {
    expect(findSimilarNames("KATHMANDU", ["KATHMANDU"])).toEqual([]);
  });

  it("returns close match as suggestion", () => {
    const result = findSimilarNames("Kathmandu Transport Co.", [
      "KATHMANDU TRANSPORT CO.LTD",
    ]);
    expect(result).toEqual(["KATHMANDU TRANSPORT CO.LTD"]);
  });

  it("returns empty array when no candidates", () => {
    expect(findSimilarNames("anything", [])).toEqual([]);
  });

  it("respects maxDistance parameter", () => {
    expect(findSimilarNames("XYZ", ["KATHMANDU"], 2)).toEqual([]);
  });

  it("returns empty array when target shorter than minLen", () => {
    expect(findSimilarNames("AB", ["KATHMANDU"])).toEqual([]);
  });

  it("sorts results by distance (closest first)", () => {
    const result = findSimilarNames("Kathmandu Transport", [
      "KATHMANDU TRANSPORTER",
      "KATHMANDU TRANSPORTS",
    ], 5);
    expect(result.length).toBe(2);
    // "KATHMANDU TRANSPORTS" distance=1, "KATHMANDU TRANSPORTER" distance=2
    expect(result[0]).toBe("KATHMANDU TRANSPORTS");
    expect(result[1]).toBe("KATHMANDU TRANSPORTER");
  });

  it("returns empty array when all candidates are too distant", () => {
    expect(findSimilarNames("Hello World", ["XYZ"], 2)).toEqual([]);
  });
});
