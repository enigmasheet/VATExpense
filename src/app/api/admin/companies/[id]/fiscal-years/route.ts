import { db } from "@/lib/db";
import { fiscalYears, companies, adminAuditLog } from "@/lib/db/schema";
import { createFiscalYearSchema } from "@/lib/validation/admin";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, unauthorized, notFound, badRequest, unprocessableEntity, conflict, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
import { eq, and } from "drizzle-orm";

function requireSuperAdmin() {
  return getSessionUser().then((u) => {
    if (!u || u.role !== ROLE_SUPER_ADMIN) return null;
    return u;
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!company) return notFound("Company not found");

    const rows = await db
      .select()
      .from(fiscalYears)
      .where(eq(fiscalYears.companyId, id))
      .orderBy(fiscalYears.startYear);

    return apiOk({ data: rows });
  } catch {
    return internalError();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(createFiscalYearSchema, { companyId: id, name: (body as Record<string, unknown>).name, startYear: (body as Record<string, unknown>).startYear, endYear: (body as Record<string, unknown>).endYear });
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const data = parsed.data;
  const isActive = (body as Record<string, unknown>).isActive === true;

  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!company) return notFound("Company not found");

    // Check name uniqueness within company
    const [dup] = await db
      .select({ id: fiscalYears.id })
      .from(fiscalYears)
      .where(and(eq(fiscalYears.companyId, id), eq(fiscalYears.name, data.name)))
      .limit(1);
    if (dup) return conflict("A fiscal year with this name already exists for this company");

    // If setting as active, deactivate others first
    const [created] = await db.transaction(async (tx) => {
      if (isActive) {
        await tx.update(fiscalYears).set({ isActive: false }).where(eq(fiscalYears.companyId, id));
      }

      const [row] = await tx
        .insert(fiscalYears)
        .values({
          companyId: id,
          name: data.name,
          startYear: data.startYear,
          endYear: data.endYear,
          isActive,
        })
        .returning();

      return [row];
    });

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "create_fiscal_year",
      targetType: "fiscal_year",
      targetId: created.id,
      targetName: created.name,
      details: JSON.stringify({ companyId: id, companyName: company.name }),
    });

    return apiOk({ data: created }, 201);
  } catch (err) {
    console.error("POST /api/admin/companies/[id]/fiscal-years failed", err);
    return internalError();
  }
}
