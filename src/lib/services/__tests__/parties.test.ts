import { describe, it, expect, vi, beforeEach } from "vitest";
import { createParty, updateParty, deleteParty } from "../parties";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { mockChainReturn, mockInsertReturn, mockUpdateReturn, mockDeleteReturn } from "@/lib/test-utils/mock-db";
import { normalizeVatNumber } from "@/lib/normalize";

describe("parties service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createParty", () => {
    it("returns duplicate when name+vat matches", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "existing-1", name: "Acme" }]) as never);
      const result = await createParty("comp-1", { name: "Acme" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("already exists");
    });

    it("returns ok on insert with unique name+vatNumber", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "p1", name: "Acme" }]) as never);
      const result = await createParty("comp-1", { name: "Acme" });
      expect(result.ok).toBe(true);
    });

    it("checks normalized vat number for duplicates", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "p1" }]) as never);
      const result = await createParty("comp-1", { name: "Acme", vatNumber: "12345" });
      expect(result.ok).toBe(true);
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe("updateParty", () => {
    it("returns not-found when no rows affected", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as never);
      const result = await updateParty("p1", "comp-1", { name: "New" });
      expect(result.ok).toBe(false);
    });

    it("returns ok when updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "p1" }]) as never);
      const result = await updateParty("p1", "comp-1", { name: "New" });
      expect(result.ok).toBe(true);
    });
  });

  describe("deleteParty", () => {
    it("returns not-found when no rows deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([]) as never);
      const result = await deleteParty("p1", "comp-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([{ id: "p1" }]) as never);
      const result = await deleteParty("p1", "comp-1");
      expect(result.ok).toBe(true);
    });
  });
});

describe("normalizeVatNumber", () => {
  it("strips non-digits", () => {
    expect(normalizeVatNumber("ABC-123")).toBe("123");
  });

  it("preserves digits", () => {
    expect(normalizeVatNumber("12345678")).toBe("12345678");
  });

  it("returns null for no digits", () => {
    expect(normalizeVatNumber("ABCDEFG")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(normalizeVatNumber(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeVatNumber("")).toBeNull();
  });
});
