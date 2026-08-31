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

vi.mock("@/lib/db-helpers/masters", () => ({
  loadActiveMasterData: vi.fn().mockResolvedValue({
    parties: [],
    categories: [],
    locations: [],
  }),
}));

vi.mock("@/lib/normalize", () => ({
  normalizeName: vi.fn((s: string) => s?.trim().toUpperCase()),
  normalizeVatNumber: vi.fn((s: string) => s?.replace(/\D/g, "")),
  findSimilarNames: vi.fn(() => []),
  levenshteinDistance: vi.fn(() => 0),
}));

vi.mock("@/lib/normalize-master-data", () => ({
  normalizePartyName: vi.fn((s: string) => s),
  normalizeLocationName: vi.fn((s: string) => s),
  normalizeItemName: vi.fn((s: string) => s),
}));

import { db } from "@/lib/db";
import { GET } from "../route";

describe("GET /api/import/[batchId]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/preview");
    const res = await GET(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 404 when import is disabled", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      mockChainReturn([{ import_enabled: false }]) as never,
    );

    const req = createMockRequest("http://localhost/api/import/batch-1/preview");
    const res = await GET(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 404 when batch not found", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([{ import_enabled: true }]) as never)
      .mockReturnValueOnce(mockChainReturn([]) as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/preview");
    const res = await GET(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 403 when batch belongs to different company", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([{ import_enabled: true }]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "batch-1", companyId: "other", status: "pending" }]) as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/preview");
    const res = await GET(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 400 when batch is already confirmed", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([{ import_enabled: true }]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "batch-1", companyId: "comp-1", status: "confirmed" }]) as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/preview");
    const res = await GET(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body).toHaveProperty("detail", "Batch is already confirmed");
  });

  it("returns 200 with empty rows when batch has no rows", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([{ import_enabled: true }]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "batch-1", companyId: "comp-1", status: "pending", filename: "test.csv", fiscalYearId: "fy-1" }]) as never)
      .mockReturnValueOnce(mockChainReturn([]) as never)
      .mockReturnValueOnce(mockChainReturn([]) as never);
    vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/preview?autoCreate=true");
    const res = await GET(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    const data = (body as { data: Record<string, unknown> }).data;
    expect(data.rows).toEqual([]);
    expect(data.filename).toBe("test.csv");
  });

  it("includes fiscalYearName in response", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(mockChainReturn([{ import_enabled: true }]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "batch-1", companyId: "comp-1", status: "pending", filename: "test.csv", fiscalYearId: "fy-1" }]) as never)
      .mockReturnValueOnce(mockChainReturn([]) as never)
      .mockReturnValueOnce(mockChainReturn([{ id: "fy-1", name: "2082/83" }]) as never);
    vi.mocked(db.update).mockReturnValue(mockUpdateReturn([]) as never);

    const req = createMockRequest("http://localhost/api/import/batch-1/preview");
    const res = await GET(req, { params: createMockParams({ batchId: "batch-1" }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    const data = (body as { data: Record<string, unknown> }).data;
    expect(data.fiscalYearName).toBe("2082/83");
  });
});
