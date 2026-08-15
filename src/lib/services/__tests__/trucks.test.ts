import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTruck, updateTruck, deleteTruck } from "../trucks";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper
function mockChainReturn(rows: any[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper
function mockInsertReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper
function mockUpdateReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock helper
function mockDeleteReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  return { where, returning };
}

describe("trucks service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTruck", () => {
    it("returns duplicate when name exists", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "existing" }]) as any);
      const result = await createTruck("comp-1", { name: "NA 1 2345" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("already exists");
    });

    it("returns ok on insert with unique name", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.insert).mockReturnValue(
        mockInsertReturn([{ id: "new-1", name: "NA 1 2345", ownerName: "Ram" }]) as any,
      );
      const result = await createTruck("comp-1", { name: "NA 1 2345", ownerName: "Ram" });
      expect(result.ok).toBe(true);
    });

    it("normalizes name for duplicate check", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "new-1" }]) as any);
      await createTruck("comp-1", { name: "  NA 1 2345  " });
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("updateTruck", () => {
    it("returns error when no valid fields", async () => {
      const result = await updateTruck("truck-1", "comp-1", {});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("No valid fields to update");
    });

    it("returns not-found when no rows updated", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as any);
      const result = await updateTruck("truck-1", "comp-1", { name: "NA 2 9999" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Truck not found");
    });

    it("returns ok when updated", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "truck-1" }]) as any);
      const result = await updateTruck("truck-1", "comp-1", { name: "NA 2 9999" });
      expect(result.ok).toBe(true);
    });

    it("updates ownerName and truckType", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "truck-1" }]) as any);
      const result = await updateTruck("truck-1", "comp-1", {
        ownerName: "Shyam",
        truckType: "Tanker",
      });
      expect(result.ok).toBe(true);
    });

    it("updates isActive", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "truck-1" }]) as any);
      const result = await updateTruck("truck-1", "comp-1", { isActive: false });
      expect(result.ok).toBe(true);
    });
  });

  describe("deleteTruck", () => {
    it("returns not-found when no rows deleted", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([]) as any);
      const result = await deleteTruck("truck-1", "comp-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when deleted", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([{ id: "truck-1" }]) as any);
      const result = await deleteTruck("truck-1", "comp-1");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.id).toBe("truck-1");
    });
  });
});
