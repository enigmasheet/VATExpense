import { db } from "@/lib/db";
import { fiscalYears, companies, adminAuditLog } from "@/lib/db/schema";
import { updateFiscalYearSchema } from "@/lib/validation/admin";
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

export async function PATCH(
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

  const parsed = safeParse(updateFiscalYearSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const data = parsed.data;
  if (Object.keys(data).length === 0) return badRequest("No fields to update");

  try {
    const [existing] = await db.select().from(fiscalYears).where(eq(fiscalYears.id, id)).limit(1);
    if (!existing) return notFound("Fiscal year not found");

    // Check name uniqueness if changing
    if (data.name && data.name !== existing.name) {
      const [dup] = await db
        .select({ id: fiscalYears.id })
        .from(fiscalYears)
        .where(and(eq(fiscalYears.companyId, existing.companyId), eq(fiscalYears.name, data.name)))
        .limit(1);
      if (dup) return conflict("A fiscal year with this name already exists for this company");
    }

    // If setting as active, deactivate others in the same company
    if (data.isActive) {
      await db.update(fiscalYears).set({ isActive: false }).where(eq(fiscalYears.companyId, existing.companyId));
    }

    const [updated] = await db
      .update(fiscalYears)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fiscalYears.id, id))
      .returning();

    const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, existing.companyId)).limit(1);

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "update_fiscal_year",
      targetType: "fiscal_year",
      targetId: updated.id,
      targetName: updated.name,
      details: JSON.stringify({ before: { name: existing.name, startYear: existing.startYear, endYear: existing.endYear, isActive: existing.isActive }, after: data, companyName: company?.name }),
    });

    return apiOk({ data: updated });
  } catch (err) {
    console.error("PATCH /api/admin/fiscal-years/[id] failed", err);
    return internalError();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  const { id } = await params;

  try {
    const [existing] = await db.select().from(fiscalYears).where(eq(fiscalYears.id, id)).limit(1);
    if (!existing) return notFound("Fiscal year not found");

    const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, existing.companyId)).limit(1);

    await db.delete(fiscalYears).where(eq(fiscalYears.id, id));

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "delete_fiscal_year",
      targetType: "fiscal_year",
      targetId: existing.id,
      targetName: existing.name,
      details: JSON.stringify({ companyName: company?.name }),
    });

    return apiOk({ data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /api/admin/fiscal-years/[id] failed", err);
    return internalError();
  }
}
