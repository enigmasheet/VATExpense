import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateCompany } from "../companies";

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
function mockUpdateReturn(rows: any[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as any);
      const result = await updateCompany("comp-1", { name: "New Name" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Company not found");
    });

    it("returns ok when name updated", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "comp-1", name: "New Name" }]) as any);
      const result = await updateCompany("comp-1", { name: "New Name" });
      expect(result.ok).toBe(true);
    });

    it("updates vatNumber to null", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "comp-1" }]) as any);
      const result = await updateCompany("comp-1", { vatNumber: null });
      expect(result.ok).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return type is intentionally loose
      vi.mocked(db.update).mockReturnValue(mockUpdateReturn([{ id: "comp-1" }]) as any);
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
