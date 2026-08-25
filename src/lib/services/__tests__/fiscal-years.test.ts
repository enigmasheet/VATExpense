import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFiscalYear, updateFiscalYear, deleteFiscalYear } from "../fiscal-years";
import {
  mockChainReturn,
  mockInsertReturn,
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

describe("fiscal-years service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default transaction mock: execute the callback with a mock tx
    vi.mocked(db.transaction).mockImplementation(async (fn) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "fy-1", name: "2080/81" }]),
          }),
        }),
      };
      return fn(tx as never);
    });
  });

  describe("createFiscalYear", () => {
    it("returns duplicate when name matches existing", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "existing-1", name: "2080/81" }]) as never);
      const result = await createFiscalYear("comp-1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("already exists");
    });

    it("returns ok on insert with unique name", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "fy-1", name: "2080/81" }]) as never);
      const result = await createFiscalYear("comp-1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
      });
      expect(result.ok).toBe(true);
    });

    it("deactivates existing active years when activating new one", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
      await createFiscalYear("comp-1", {
        name: "2080/81",
        startYear: 2080,
        endYear: 2081,
        isActive: true,
      });
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe("updateFiscalYear", () => {
    it("returns not-found when no rows affected", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as never);
      const result = await updateFiscalYear("fy-1", "comp-1", { name: "New" });
      expect(result.ok).toBe(false);
    });

    it("returns ok when updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "fy-1" }]) as never);
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
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      } as never);
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([]) as never);
      const result = await deleteFiscalYear("fy-1", "comp-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when deleted", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      } as never);
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([{ id: "fy-1" }]) as never);
      const result = await deleteFiscalYear("fy-1", "comp-1");
      expect(result.ok).toBe(true);
    });
  });
});
