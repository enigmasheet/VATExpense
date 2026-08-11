import { describe, it, expect } from "vitest";
import { toFixedStr, round2, amountsClose } from "../money";

describe("toFixedStr", () => {
  it("returns null for null/undefined/empty", () => {
    expect(toFixedStr(null, 2)).toBeNull();
    expect(toFixedStr(undefined, 2)).toBeNull();
    expect(toFixedStr("", 2)).toBeNull();
  });

  it("formats number with given scale", () => {
    expect(toFixedStr(1.234, 2)).toBe("1.23");
    expect(toFixedStr(1.235, 2)).toBe("1.24");
    expect(toFixedStr(1, 2)).toBe("1.00");
  });

  it("handles string input", () => {
    expect(toFixedStr("1.234", 2)).toBe("1.23");
  });

  it("strips commas from string input", () => {
    expect(toFixedStr("1,234.56", 2)).toBe("1234.56");
  });

  it("returns null for non-finite", () => {
    expect(toFixedStr(NaN, 2)).toBeNull();
    expect(toFixedStr(Infinity, 2)).toBeNull();
  });

  it("handles zero", () => {
    expect(toFixedStr(0, 2)).toBe("0.00");
  });
});

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(1.1)).toBe(1.1);
    expect(round2(1.004)).toBe(1);
    expect(round2(1.006)).toBe(1.01);
  });

  it("handles negative 1.005", () => {
    expect(round2(-1.005)).toBe(-1);
  });

  it("handles zero", () => {
    expect(round2(0)).toBe(0);
  });

  it("rounds correctly", () => {
    expect(round2(1.235)).toBe(1.24);
    expect(round2(1.225)).toBe(1.23);
  });
});

describe("amountsClose", () => {
  it("returns true for same numbers", () => {
    expect(amountsClose(10, 10)).toBe(true);
  });

  it("returns true for very close numbers", () => {
    expect(amountsClose(10, 10.0005)).toBe(true);
  });

  it("returns false for sufficiently different numbers", () => {
    expect(amountsClose(10, 10.01)).toBe(false);
  });

  it("returns true within epsilon boundary", () => {
    expect(amountsClose(10.0, 10.0009)).toBe(true);
  });

  it("returns false outside epsilon boundary", () => {
    expect(amountsClose(10.0, 10.0011)).toBe(false);
  });
});
