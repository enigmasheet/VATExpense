import { describe, it, expect } from "vitest";
import { getSegment, bumpSegment, clampDay, getDaysInMonth, pad } from "../miti-date-utils";

describe("getSegment", () => {
  it("returns year for positions 0-3", () => {
    expect(getSegment(0)).toBe("year");
    expect(getSegment(2)).toBe("year");
    expect(getSegment(3)).toBe("year");
  });

  it("returns month for positions 4-6", () => {
    expect(getSegment(4)).toBe("month");
    expect(getSegment(5)).toBe("month");
    expect(getSegment(6)).toBe("month");
  });

  it("returns day for positions 7-9", () => {
    expect(getSegment(7)).toBe("day");
    expect(getSegment(8)).toBe("day");
    expect(getSegment(9)).toBe("day");
  });

  it("returns day for positions beyond 9", () => {
    expect(getSegment(10)).toBe("day");
    expect(getSegment(15)).toBe("day");
  });
});

describe("pad", () => {
  it("pads single digit", () => {
    expect(pad(1)).toBe("01");
    expect(pad(9)).toBe("09");
  });

  it("does not pad double digit", () => {
    expect(pad(10)).toBe("10");
    expect(pad(31)).toBe("31");
  });
});

describe("clampDay", () => {
  it("clamps day to max for month", () => {
    const maxDay = getDaysInMonth(2083, 1);
    expect(clampDay(2083, 1, 32)).toBe(maxDay);
    expect(clampDay(2083, 1, 0)).toBe(1);
  });

  it("clamps day for short months", () => {
    const daysJestha = getDaysInMonth(2083, 3);
    expect(clampDay(2083, 3, 32)).toBe(daysJestha);
    const daysAshadh = getDaysInMonth(2083, 4);
    expect(clampDay(2083, 4, 32)).toBe(daysAshadh);
  });

  it("returns day if valid", () => {
    expect(clampDay(2083, 1, 15)).toBe(15);
  });
});

describe("getDaysInMonth", () => {
  it("returns correct days for Baisakh", () => {
    const days = getDaysInMonth(2083, 1);
    expect(days).toBeGreaterThanOrEqual(30);
    expect(days).toBeLessThanOrEqual(32);
  });

  it("returns correct days for Chaitra", () => {
    const days = getDaysInMonth(2083, 12);
    expect(days).toBeGreaterThanOrEqual(30);
    expect(days).toBeLessThanOrEqual(32);
  });
});

describe("bumpSegment", () => {
  describe("year segment", () => {
    it("increments year by 1", () => {
      const result = bumpSegment("2083-04-15", 2, 1);
      expect(result.value).toBe("2084-04-15");
      expect(result.segment).toBe("year");
    });

    it("decrements year by 1", () => {
      const result = bumpSegment("2083-04-15", 2, -1);
      expect(result.value).toBe("2082-04-15");
      expect(result.segment).toBe("year");
    });

    it("clamps year to max BS year", () => {
      const result = bumpSegment("2099-04-15", 2, 1);
      expect(result.value).toBe("2099-04-15");
    });

    it("clamps year to min BS year", () => {
      const result = bumpSegment("2000-04-15", 2, -1);
      expect(result.value).toBe("2000-04-15");
    });

    it("clamps day when year changes", () => {
      const result = bumpSegment("2081-12-31", 2, 1);
      const daysInMonth = getDaysInMonth(2082, 12);
      expect(result.value).toBe("2082-12-" + String(daysInMonth).padStart(2, "0"));
    });
  });

  describe("month segment", () => {
    it("increments month by 1", () => {
      const result = bumpSegment("2083-04-15", 5, 1);
      expect(result.value).toBe("2083-05-15");
      expect(result.segment).toBe("month");
    });

    it("decrements month by 1", () => {
      const result = bumpSegment("2083-04-15", 5, -1);
      expect(result.value).toBe("2083-03-15");
    });

    it("wraps from 12 to 1", () => {
      const result = bumpSegment("2083-12-15", 5, 1);
      expect(result.value).toBe("2083-01-15");
    });

    it("wraps from 1 to 12", () => {
      const result = bumpSegment("2083-01-15", 5, -1);
      expect(result.value).toBe("2083-12-15");
    });

    it("clamps day when month changes to shorter month", () => {
      const result = bumpSegment("2083-01-31", 5, 1);
      const maxDay = getDaysInMonth(2083, 2);
      const day = Number(result.value.split("-")[2]);
      expect(day).toBeLessThanOrEqual(maxDay);
    });
  });

  describe("day segment", () => {
    it("increments day by 1", () => {
      const result = bumpSegment("2083-04-15", 8, 1);
      expect(result.value).toBe("2083-04-16");
      expect(result.segment).toBe("day");
    });

    it("decrements day by 1", () => {
      const result = bumpSegment("2083-04-15", 8, -1);
      expect(result.value).toBe("2083-04-14");
    });

    it("wraps from last day to 1", () => {
      const daysInMonth = getDaysInMonth(2083, 4);
      const result = bumpSegment("2083-04-" + String(daysInMonth).padStart(2, "0"), 8, 1);
      expect(result.value).toBe("2083-04-01");
    });

    it("wraps from 1 to last day", () => {
      const daysInMonth = getDaysInMonth(2083, 4);
      const result = bumpSegment("2083-04-01", 8, -1);
      expect(result.value).toBe("2083-04-" + String(daysInMonth).padStart(2, "0"));
    });
  });

  describe("invalid input", () => {
    it("returns original value for non-matching format", () => {
      const result = bumpSegment("abc", 2, 1);
      expect(result.value).toBe("abc");
    });

    it("returns original value for partial date", () => {
      const result = bumpSegment("2083-04", 2, 1);
      expect(result.value).toBe("2083-04");
    });
  });

  it("returns the changed segment", () => {
    expect(bumpSegment("2083-04-15", 2, 1).segment).toBe("year");
    expect(bumpSegment("2083-04-15", 5, 1).segment).toBe("month");
    expect(bumpSegment("2083-04-15", 8, 1).segment).toBe("day");
  });
});
