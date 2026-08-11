import { db } from "@/lib/db";
import { fiscalYears } from "@/lib/db/schema";
import { createFiscalYearSchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, conflict, unprocessableEntity, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { and, eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const rows = await db
      .select()
      .from(fiscalYears)
      .where(eq(fiscalYears.companyId, companyId))
      .orderBy(fiscalYears.startYear);
    return apiOk({ data: rows });
  } catch {
    return internalError();
  }
}

export async function POST(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(createFiscalYearSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const { name, startYear, endYear, isActive } = parsed.data;

    const existing = await db
      .select({ id: fiscalYears.id, name: fiscalYears.name })
      .from(fiscalYears)
      .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.name, name)))
      .limit(1);
    if (existing.length > 0) {
      return conflict(`Fiscal year "${name}" already exists`, { existing: existing[0] });
    }

    if (isActive) {
      await db
        .update(fiscalYears)
        .set({ isActive: false, updatedAt: sql`now()` })
        .where(eq(fiscalYears.companyId, companyId));
    }

    const [created] = await db
      .insert(fiscalYears)
      .values({ companyId, name, startYear, endYear, isActive })
      .returning();
    return apiOk({ data: created }, 201);
  } catch (err) {
    console.error("POST /api/fiscal-years failed", err);
    return internalError();
  }
}