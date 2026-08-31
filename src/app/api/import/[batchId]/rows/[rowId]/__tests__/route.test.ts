import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockChainReturn, mockUpdateReturn } from "@/lib/test-utils/mock-db";
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

import { db } from "@/lib/db";
import { PATCH } from "../route";

describe("PATCH /api/import/[batchId]/rows/[rowId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.select).mockReset();
    vi.mocked(db.update).mockReset();
  });

  function mockBatchAndRow(batchOverrides = {}, rowOverrides = {}) {
    const batch = {
      id: "batch-1",
      companyId: "comp-1",
      status: "pending",
      ...batchOverrides,
    };
    const row = {
      id: "row-1",
      batchId: "batch-1",
      rawPartyName: "Acme",
      ...rowOverrides,
    };
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([batch]) as never)
      .mockReturnValueOnce(mockChainReturn([row]) as never);
    vi.mocked(db.update).mockReturnValue(mockUpdateReturn([row]) as never);
  }

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { rawPartyName: "New Party" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body).toHaveProperty("detail", "Invalid JSON body");
  });

  it("returns 400 when no valid fields provided", async () => {
    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { invalidField: "value" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 404 when batch not found", async () => {
    vi.mocked(db.select).mockReturnValue(mockChainReturn([]) as never);
    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { rawPartyName: "New Party" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 403 when batch belongs to different company", async () => {
    mockBatchAndRow({ companyId: "other-company" });
    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { rawPartyName: "New Party" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 400 when batch is not pending", async () => {
    mockBatchAndRow({ status: "confirmed" });
    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { rawPartyName: "New Party" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body).toHaveProperty("detail", "Batch is already confirmed");
  });

  it("returns 404 when row not found in batch", async () => {
    const batch = { id: "batch-1", companyId: "comp-1", status: "pending" };
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([batch]) as never)
      .mockReturnValueOnce(mockChainReturn([]) as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { rawPartyName: "New Party" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("updates row and returns 200 on success", async () => {
    mockBatchAndRow();
    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { rawPartyName: "New Party", rawCategoryName: "Fuel" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    const data = (body as { data: Record<string, unknown> }).data;
    expect(data.rawPartyName).toBe("New Party");
    expect(data.rawCategoryName).toBe("Fuel");
  });

  it("ignores non-updatable fields", async () => {
    mockBatchAndRow();
    const req = createMockRequest("http://localhost/api/import/batch-1/rows/row-1", {
      method: "PATCH",
      body: { rawPartyName: "New Party", status: "confirmed", id: "hacked" },
    });
    const params = createMockParams({ batchId: "batch-1", rowId: "row-1" });
    const res = await PATCH(req, { params });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    const data = (body as { data: Record<string, unknown> }).data;
    expect(data.rawPartyName).toBe("New Party");
    expect(data.status).toBeUndefined();
    expect(data.id).toBe("row-1");
  });
});
