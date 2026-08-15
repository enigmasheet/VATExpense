import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper for DB chain
function mockSelectChain(rows: any[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper for DB chain
function mockInsertChain(row: any) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper for DB chain
function mockUpdateChain(row: any) {
  const returning = vi.fn().mockResolvedValue([row]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper for DB chain
function mockDeleteChain(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  return { where, returning };
}

describe("fiscal year regression protection", () => {
  let createFiscalYear: typeof import("@/lib/services/fiscal-years").createFiscalYear;
  let updateFiscalYear: typeof import("@/lib/services/fiscal-years").updateFiscalYear;
  let deleteFiscalYear: typeof import("@/lib/services/fiscal-years").deleteFiscalYear;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/services/fiscal-years");
    createFiscalYear = mod.createFiscalYear;
    updateFiscalYear = mod.updateFiscalYear;
    deleteFiscalYear = mod.deleteFiscalYear;
  });

  describe("createFiscalYear", () => {
    it("creates FY with activation", async () => {
      const selectChain = mockSelectChain([]);
      vi.mocked(db.select).mockReturnValue(selectChain as any);

      const newFY = { id: "fy1", name: "2080/81", companyId: "c1", isActive: true };
      vi.mocked(db.transaction).mockImplementation(async (fn: any) => {
        const insertReturning = vi.fn().mockResolvedValue([newFY]);
        const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
        const txInsert = vi.fn().mockReturnValue({ values: insertValues });
        const txUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
        const tx = { insert: txInsert, update: txUpdate, select: db.select, delete: db.delete } as any;
        return fn(tx);
      });

      const result = await createFiscalYear("c1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
        isActive: true,
      });

      expect(result.ok).toBe(true);
      expect(db.transaction).toHaveBeenCalled();
    });

    it("rejects duplicate name within company", async () => {
      const existingFY = { id: "existing", name: "2080/81" };
      const selectChain = mockSelectChain([existingFY]);
      vi.mocked(db.select).mockReturnValue(selectChain as any);

      const result = await createFiscalYear("c1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("already exists");
      }
    });
  });

  describe("updateFiscalYear", () => {
    it("updates FY with activation", async () => {
      vi.mocked(db.transaction).mockImplementation(async (fn: any) => {
        const txUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
        const tx = { insert: db.insert, update: txUpdate, select: db.select, delete: db.delete } as any;
        return fn(tx);
      });

      const updatedFY = { id: "fy1", name: "2080/81", isActive: true };
      const selectChain = mockSelectChain([updatedFY]);
      vi.mocked(db.select).mockReturnValue(selectChain as any);

      const result = await updateFiscalYear("fy1", "c1", { isActive: true });

      expect(result.ok).toBe(true);
      expect(db.transaction).toHaveBeenCalled();
    });

    it("rejects update with no valid fields", async () => {
      const result = await updateFiscalYear("fy1", "c1", {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("No valid fields");
      }
    });

    it("returns not-found when FY doesn't exist", async () => {
      const updateChain = mockUpdateChain(null);
      updateChain.returning.mockResolvedValue([]);
      vi.mocked(db.update).mockReturnValue(updateChain as any);

      const result = await updateFiscalYear("nonexistent", "c1", { name: "New Name" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("deleteFiscalYear", () => {
    it("deletes FY scoped to company", async () => {
      const deleteChain = mockDeleteChain([{ id: "fy1" }]);
      vi.mocked(db.delete).mockReturnValue(deleteChain as any);

      const result = await deleteFiscalYear("fy1", "c1");

      expect(result.ok).toBe(true);
    });

    it("returns not-found when FY doesn't exist", async () => {
      const deleteChain = mockDeleteChain([]);
      vi.mocked(db.delete).mockReturnValue(deleteChain as any);

      const result = await deleteFiscalYear("nonexistent", "c1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });
});
