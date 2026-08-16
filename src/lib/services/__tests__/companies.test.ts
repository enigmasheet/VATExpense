import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateCompany } from "../companies";
import { mockUpdateReturn } from "@/lib/test-utils/mock-db";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/lib/db";

describe("companies service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateCompany", () => {
    it("returns error when no valid fields", async () => {
      const result = await updateCompany("comp-1", {});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("No valid fields to update");
    });

    it("returns not-found when no rows updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as never);
      const result = await updateCompany("comp-1", { name: "New Name" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Company not found");
    });

    it("returns ok when name updated", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "comp-1", name: "New Name" }]) as never);
      const result = await updateCompany("comp-1", { name: "New Name" });
      expect(result.ok).toBe(true);
    });

    it("updates vatNumber to null", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "comp-1" }]) as never);
      const result = await updateCompany("comp-1", { vatNumber: null });
      expect(result.ok).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "comp-1" }]) as never);
      const result = await updateCompany("comp-1", {
        name: "Updated Co",
        address: "Kathmandu",
        phone: "9841234567",
        email: "info@test.com",
        defaultVatRate: "15.00",
      });
      expect(result.ok).toBe(true);
    });
  });
});
