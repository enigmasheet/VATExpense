import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLocation, updateLocation, deleteLocation } from "../locations";

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

describe("locations service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLocation", () => {
    it("returns duplicate when name exists", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([{ id: "existing" }]) as never);
      const result = await createLocation("comp-1", { name: "Kathmandu" });
      expect(result.ok).toBe(false);
    });

    it("returns ok with new location", async () => {
      vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertReturn([{ id: "loc-1", name: "Kathmandu" }]) as never);
      const result = await createLocation("comp-1", { name: "Kathmandu" });
      expect(result.ok).toBe(true);
    });
  });

  describe("updateLocation", () => {
    it("returns not-found when no rows affected", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as never);
      const result = await updateLocation("loc-1", "comp-1", { name: "New Name" });
      expect(result.ok).toBe(false);
    });

    it("returns ok when updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "loc-1" }]) as never);
      const result = await updateLocation("loc-1", "comp-1", { name: "New Name" });
      expect(result.ok).toBe(true);
    });
  });

  describe("deleteLocation", () => {
    it("returns not-found when no rows deleted", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      } as never);
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([]) as never);
      const result = await deleteLocation("loc-1", "comp-1");
      expect(result.ok).toBe(false);
    });

    it("returns ok when deleted", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      } as never);
      vi.mocked(db.delete).mockReturnValue(mockDeleteReturn([{ id: "loc-1" }]) as never);
      const result = await deleteLocation("loc-1", "comp-1");
      expect(result.ok).toBe(true);
    });
  });
});
