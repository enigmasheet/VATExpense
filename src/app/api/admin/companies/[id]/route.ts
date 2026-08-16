import { db } from "@/lib/db";
import { companies, adminAuditLog } from "@/lib/db/schema";
import { updateCompanySchema } from "@/lib/validation/admin";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, unauthorized, notFound, badRequest, unprocessableEntity, conflict, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
import { eq, ilike } from "drizzle-orm";

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
    const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!row) return notFound("Company not found");
    return apiOk({ data: row });
  } catch {
    return internalError();
  }
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

  const parsed = safeParse(updateCompanySchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const data = parsed.data;
  if (Object.keys(data).length === 0) return badRequest("No fields to update");

  try {
    const [existing] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!existing) return notFound("Company not found");

    // Check name uniqueness if changing
    if (data.name && data.name !== existing.name) {
      const [dup] = await db.select({ id: companies.id }).from(companies).where(ilike(companies.name, data.name)).limit(1);
      if (dup) return conflict("A company with this name already exists");
    }

    const [updated] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "update_company",
      targetType: "company",
      targetId: updated.id,
      targetName: updated.name,
      details: JSON.stringify({ before: { name: existing.name, vatNumber: existing.vatNumber }, after: data }),
    });

    return apiOk({ data: updated });
  } catch (err) {
    console.error("PATCH /api/admin/companies/[id] failed", err);
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
    const [existing] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!existing) return notFound("Company not found");

    await db.delete(companies).where(eq(companies.id, id));

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "delete_company",
      targetType: "company",
      targetId: existing.id,
      targetName: existing.name,
    });

    return apiOk({ data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /api/admin/companies/[id] failed", err);
    return internalError();
  }
}
