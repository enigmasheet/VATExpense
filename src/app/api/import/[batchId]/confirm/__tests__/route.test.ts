import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockChainReturn, mockUpdateReturn, mockInsertReturn } from "@/lib/test-utils/mock-db";
import { createMockRequest, createMockParams, parseResponse } from "@/lib/test-utils/mock-request";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", companyId: "comp-1", role: "Admin" },
  }),
}));

vi.mock("@/lib/actions/expenses-helpers", () => ({
  resolveFiscalYear: vi.fn().mockResolvedValue({ fiscalYearId: "fy-1" }),
}));

vi.mock("@/lib/normalize-master-data", () => ({
  normalizeItemName: vi.fn((s: string) => s),
}));

vi.mock("@/lib/nepali-date", () => ({
  normalizeMiti: vi.fn((s: string) => s),
}));

import { db } from "@/lib/db";
import { POST } from "../route";

describe("POST /api/import/[batchId]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.select).mockReset();
    vi.mocked(db.update).mockReset();
    vi.mocked(db.insert).mockReset();
    vi.mocked(db.transaction).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const req = createMockRequest("http://localhost/api/import/batch-1/confirm", { method: "POST" });
    const res = await POST(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 404 when import is disabled", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ import_enabled: false }]) as never,
    );

    const req = createMockRequest("http://localhost/api/import/batch-1/confirm", { method: "POST" });
    const res = await POST(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 409 when batch is already confirmed", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ import_enabled: true }]) as never,
    );
    vi.mocked(db.update).mockReturnValueOnce(mockUpdateReturn([]) as never);
    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ id: "batch-1", companyId: "comp-1", status: "confirmed" }]) as never,
    );

    const req = createMockRequest("http://localhost/api/import/batch-1/confirm", { method: "POST" });
    const res = await POST(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(409);
    expect(body).toHaveProperty("detail", "Batch is already confirmed");
  });

  it("returns 403 when batch belongs to different company", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ import_enabled: true }]) as never,
    );
    vi.mocked(db.update).mockReturnValueOnce(mockUpdateReturn([]) as never);
    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ id: "batch-1", companyId: "other-company", status: "pending" }]) as never,
    );

    const req = createMockRequest("http://localhost/api/import/batch-1/confirm", { method: "POST" });
    const res = await POST(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 400 when no valid rows", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ import_enabled: true }]) as never,
    );
    vi.mocked(db.update).mockReturnValueOnce(
      mockUpdateReturn([{ id: "batch-1", companyId: "comp-1", status: "confirming", fiscalYearId: "fy-1" }]) as never,
    );
    vi.mocked(db.select).mockReturnValueOnce(mockChainReturn([]) as never);
    vi.mocked(db.update).mockReturnValueOnce(mockUpdateReturn([]) as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/confirm", { method: "POST" });
    const res = await POST(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body).toHaveProperty("detail", "No valid rows to import");
  });

  it("successfully confirms and inserts expenses", async () => {
    const validRow = {
      id: "row-1", rowIndex: 0, status: "valid",
      resolvedPartyId: "p-1", resolvedCategoryId: "cat-1", resolvedLocationId: null,
      resolvedMiti: "2083-04-01", resolvedNepaliMonth: "Baisakh",
      resolvedTaxableAmount: "1000", resolvedVatAmount: "130",
      resolvedTotalAmount: "1130", resolvedVatRate: "13",
      rawInvoiceNumber: "INV-001", rawItem: "Diesel",
      rawQuantity: null, rawRate: null, rawRemarks: null,
    };

    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ import_enabled: true }]) as never,
    );
    vi.mocked(db.update).mockReturnValueOnce(
      mockUpdateReturn([{ id: "batch-1", companyId: "comp-1", status: "confirming", fiscalYearId: "fy-1" }]) as never,
    );
    vi.mocked(db.select).mockReturnValueOnce(mockChainReturn([validRow]) as never);
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([{ id: "p-1", locationId: null }]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "cat-1" }]) as never)
      .mockReturnValueOnce(mockChainReturn([]) as never);
    vi.mocked(db.select).mockReturnValueOnce(mockChainReturn([]) as never);

    vi.mocked(db.transaction).mockImplementation(async (fn) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "exp-1" }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      return fn(tx as never);
    });

    const req = createMockRequest("http://localhost/api/import/batch-1/confirm", { method: "POST" });
    const res = await POST(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    const data = (body as { data: Record<string, unknown> }).data;
    expect(data.importedCount).toBe(1);
    expect(data.status).toBe("confirmed");
  });

  it("uses resolveFiscalYear for per-row FY resolution", async () => {
    const { resolveFiscalYear } = await import("@/lib/actions/expenses-helpers");
    vi.mocked(resolveFiscalYear).mockClear();
    vi.mocked(resolveFiscalYear).mockResolvedValue({ fiscalYearId: "fy-custom" });

    const validRow = {
      id: "row-1", rowIndex: 0, status: "valid",
      resolvedPartyId: "p-1", resolvedCategoryId: "cat-1", resolvedLocationId: null,
      resolvedMiti: "2082-06-15", resolvedNepaliMonth: "Shrawan",
      resolvedTaxableAmount: "500", resolvedVatAmount: "65",
      resolvedTotalAmount: "565", resolvedVatRate: "13",
      rawInvoiceNumber: "INV-002", rawItem: "Fuel",
      rawQuantity: null, rawRate: null, rawRemarks: null,
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([{ import_enabled: true }]) as never)
      .mockReturnValueOnce(mockChainReturn([validRow]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "p-1", locationId: null }]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "cat-1" }]) as never)
      .mockReturnValueOnce(mockChainReturn([]) as never);
    vi.mocked(db.update).mockReturnValueOnce(
      mockUpdateReturn([{ id: "batch-1", companyId: "comp-1", status: "confirming", fiscalYearId: "fy-1" }]) as never,
    );

    vi.mocked(db.transaction).mockImplementation(async (fn) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "exp-1" }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      return fn(tx as never);
    });

    const req = createMockRequest("http://localhost/api/import/batch-1/confirm", { method: "POST" });
    const res = await POST(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(vi.mocked(resolveFiscalYear)).toHaveBeenCalledWith("comp-1", "2082-06-15");
  });
});
