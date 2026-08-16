import { db } from "@/lib/db";
import { users, companies, adminAuditLog } from "@/lib/db/schema";
import { updateUserSchema } from "@/lib/validation/admin";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, unauthorized, notFound, badRequest, unprocessableEntity, conflict, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
import { eq } from "drizzle-orm";

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
    const [row] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        companyId: users.companyId,
        companyName: companies.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(companies, eq(companies.id, users.companyId))
      .where(eq(users.id, id))
      .limit(1);

    if (!row) return notFound("User not found");
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

  const parsed = safeParse(updateUserSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const data = parsed.data;
  if (Object.keys(data).length === 0) return badRequest("No fields to update");

  try {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return notFound("User not found");

    // Check email uniqueness if changing
    if (data.email && data.email !== existing.email) {
      const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
      if (dup) return conflict("A user with this email already exists");
    }

    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    // Audit log
    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "update_user",
      targetType: "user",
      targetId: updated.id,
      targetName: updated.email,
      details: JSON.stringify({ before: { name: existing.name, email: existing.email, role: existing.role, isActive: existing.isActive }, after: data }),
    });

    return apiOk({ data: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive } });
  } catch (err) {
    console.error("PATCH /api/admin/users/[id] failed", err);
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
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return notFound("User not found");

    await db.delete(users).where(eq(users.id, id));

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "delete_user",
      targetType: "user",
      targetId: existing.id,
      targetName: existing.email,
      details: JSON.stringify({ name: existing.name, email: existing.email, role: existing.role }),
    });

    return apiOk({ data: { deleted: true } });
  } catch (err) {
    console.error("DELETE /api/admin/users/[id] failed", err);
    return internalError();
  }
}
