import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockChainReturn,
  mockUpdateReturn,
  mockDeleteReturn,
} from "@/lib/test-utils/mock-db";

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
      const selectChain = mockChainReturn([]);
      vi.mocked(db.select).mockReturnValue(selectChain as never);

      const newFY = { id: "fy1", name: "2080/81", companyId: "c1", isActive: true };
      vi.mocked(db.transaction).mockImplementation(async (fn) => {
        const insertReturning = vi.fn().mockResolvedValue([newFY]);
        const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
        const txInsert = vi.fn().mockReturnValue({ values: insertValues });
        const txUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
        const tx = { insert: txInsert, update: txUpdate, select: db.select, delete: db.delete } as never;
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
      const selectChain = mockChainReturn([existingFY]);
      vi.mocked(db.select).mockReturnValue(selectChain as never);

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
      vi.mocked(db.transaction).mockImplementation(async (fn) => {
        const txUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
        const tx = { insert: db.insert, update: txUpdate, select: db.select, delete: db.delete } as never;
        return fn(tx);
      });

      const updatedFY = { id: "fy1", name: "2080/81", isActive: true };
      const selectChain = mockChainReturn([updatedFY]);
      vi.mocked(db.select).mockReturnValue(selectChain as never);

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
      const updateChain = mockUpdateReturn(null);
      updateChain.returning.mockResolvedValue([]);
      vi.mocked(db.update).mockReturnValue(updateChain as never);

      const result = await updateFiscalYear("nonexistent", "c1", { name: "New Name" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("deleteFiscalYear", () => {
    it("deletes FY scoped to company", async () => {
      const deleteChain = mockDeleteReturn([{ id: "fy1" }]);
      vi.mocked(db.delete).mockReturnValue(deleteChain as never);

      const result = await deleteFiscalYear("fy1", "c1");

      expect(result.ok).toBe(true);
    });

    it("returns not-found when FY doesn't exist", async () => {
      const deleteChain = mockDeleteReturn([]);
      vi.mocked(db.delete).mockReturnValue(deleteChain as never);

      const result = await deleteFiscalYear("nonexistent", "c1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });
});
