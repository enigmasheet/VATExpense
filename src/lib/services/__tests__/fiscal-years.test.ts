import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFiscalYear, updateFiscalYear, deleteFiscalYear } from "../fiscal-years";

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

describe("fiscal-years service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createFiscalYear", () => {
    it("returns duplicate when name matches existing", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "existing-1", name: "2080/81" }]) as any);
      const result = await createFiscalYear("comp-1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("already exists");
    });

    it("returns ok on insert with unique name", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as any);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "fy-1", name: "2080/81" }]) as any);
      const result = await createFiscalYear("comp-1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
      });
      expect(result.ok).toBe(true);
    });

    it("deactivates existing active years when activating new one", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as any);
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as any);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "fy-1" }]) as any);
      await createFiscalYear("comp-1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
        isActive: true,
      });
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe("updateFiscalYear", () => {
    it("returns not-found when no rows affected", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as any);
      const result = await updateFiscalYear("fy-1", "comp-1", { name: "New" });
      expect(result.ok).toBe(false);
    });

    it("returns ok when updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "fy-1" }]) as any);
      const result = await updateFiscalYear("fy-1", "comp-1", { name: "New" });
      expect(result.ok).toBe(true);
    });

    it("returns error when no valid fields", async () => {
      const result = await updateFiscalYear("fy-1", "comp-1", {});
      expect(result.ok).toBe(false);
    });
  });

  describe("deleteFiscalYear", () => {
    it("returns not-found when no rows deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([]) as any);
      const result = await deleteFiscalYear("fy-1", "comp-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([{ id: "fy-1" }]) as any);
      const result = await deleteFiscalYear("fy-1", "comp-1");
      expect(result.ok).toBe(true);
    });
  });
});
