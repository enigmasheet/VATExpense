import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTruck, updateTruck, deleteTruck } from "../trucks";
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
  },
}));

import { db } from "@/lib/db";

describe("trucks service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTruck", () => {
    it("returns duplicate when name exists", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "existing" }]) as never);
      const result = await createTruck("comp-1", { name: "NA 1 2345" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("already exists");
    });

    it("returns ok on insert with unique name", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
      vi.mocked(db.insert).mockReturnValue(
        mockInsertReturn([{ id: "new-1", name: "NA 1 2345", ownerName: "Ram" }]) as never,
      );
      const result = await createTruck("comp-1", { name: "NA 1 2345", ownerName: "Ram" });
      expect(result.ok).toBe(true);
    });

    it("normalizes name for duplicate check", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "new-1" }]) as never);
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
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as never);
      const result = await updateTruck("truck-1", "comp-1", { name: "NA 2 9999" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Truck not found");
    });

    it("returns ok when updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "truck-1" }]) as never);
      const result = await updateTruck("truck-1", "comp-1", { name: "NA 2 9999" });
      expect(result.ok).toBe(true);
    });

    it("updates ownerName and truckType", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "truck-1" }]) as never);
      const result = await updateTruck("truck-1", "comp-1", {
        ownerName: "Shyam",
        truckType: "Tanker",
      });
      expect(result.ok).toBe(true);
    });

    it("updates isActive", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "truck-1" }]) as never);
      const result = await updateTruck("truck-1", "comp-1", { isActive: false });
      expect(result.ok).toBe(true);
    });
  });

  describe("deleteTruck", () => {
    it("returns not-found when no rows deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([]) as never);
      const result = await deleteTruck("truck-1", "comp-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when deleted", async () => {
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([{ id: "truck-1" }]) as never);
      const result = await deleteTruck("truck-1", "comp-1");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.id).toBe("truck-1");
    });
  });
});
