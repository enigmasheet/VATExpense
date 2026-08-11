import { describe, it, expect } from "vitest";
import { safeParse, zodErrors } from "../utils";
import { z } from "zod";

describe("safeParse", () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().min(0) });

  it("returns ok with parsed data for valid input", () => {
    const result = safeParse(schema, { name: "Alice", age: 30 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Alice");
      expect(result.data.age).toBe(30);
    }
  });

  it("returns errors for invalid input", () => {
    const result = safeParse(schema, { name: "", age: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBe(2);
    }
  });

  it("collects multiple errors", () => {
    const result = safeParse(schema, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("zodErrors", () => {
  it("formats issues with path", () => {
    const schema = z.object({ name: z.string().min(1) });
    const error = schema.safeParse({ name: "" });
    expect(error.success).toBe(false);
    if (!error.success) {
      const result = zodErrors(error.error);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("name");
    }
  });

  it("formats issues without path", () => {
    const schema = z.string();
    const error = schema.safeParse(123);
    expect(error.success).toBe(false);
    if (!error.success) {
      const result = zodErrors(error.error);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("accepts ZodError object", () => {
    const schema = z.object({ x: z.string() });
    const error = schema.safeParse({ x: 123 });
    expect(error.success).toBe(false);
    if (!error.success) {
      const result = zodErrors(error.error);
      expect(result.length).toBe(1);
    }
  });
});
