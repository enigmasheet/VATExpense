import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateCategory, deleteCategory, createCategory } from "../categories";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";

function mockChainReturn(rows: any[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

function mockInsertReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

function mockUpdateReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

function mockDeleteReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  return { where, returning };
}

describe("categories service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategory", () => {
    it("returns duplicate when name exists", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "existing" }]) as any);
      const result = await createCategory("comp-1", { name: "Office" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("already exists");
    });

    it("returns ok on insert with unique name", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as any);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "new-1", name: "Travel" }]) as any);
      const result = await createCategory("comp-1", { name: "Travel" });
      expect(result.ok).toBe(true);
    });
  });

  describe("updateCategory", () => {
    it("returns not-found when no rows affected", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as any);
      const result = await updateCategory("cat-1", "comp-1", { name: "New Name" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Category not found");
    });

    it("returns ok with data when updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "cat-1" }]) as any);
      const result = await updateCategory("cat-1", "comp-1", { name: "New Name" });
      expect(result.ok).toBe(true);
    });

    it("returns error when no valid fields", async () => {
      const result = await updateCategory("cat-1", "comp-1", {});
      expect(result.ok).toBe(false);
    });
  });

  describe("deleteCategory", () => {
    it("returns not-found when no rows deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([]) as any);
      const result = await deleteCategory("cat-1", "comp-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([{ id: "cat-1" }]) as any);
      const result = await deleteCategory("cat-1", "comp-1");
      expect(result.ok).toBe(true);
    });
  });
});
