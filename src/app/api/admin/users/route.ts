import { db } from "@/lib/db";
import { users, companies, adminAuditLog } from "@/lib/db/schema";
import { createUserSchema } from "@/lib/validation/admin";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, unauthorized, badRequest, conflict, unprocessableEntity, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN, BCRYPT_SALT_ROUNDS } from "@/lib/constants";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function requireSuperAdmin() {
  return getSessionUser().then((u) => {
    if (!u || u.role !== ROLE_SUPER_ADMIN) return null;
    return u;
  });
}

/**
 * Lists all users across companies (superadmin only).
 */
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  try {
    const rows = await db
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
      .orderBy(users.createdAt);
    return apiOk({ data: rows });
  } catch {
    return internalError();
  }
}

/**
 * Creates a new user for a company (superadmin only).
 */
export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(createUserSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const data = parsed.data;

  try {
    // Verify company exists
    const [company] = await db.select().from(companies).where(eq(companies.id, data.companyId)).limit(1);
    if (!company) return badRequest("Company not found");

    // Check email uniqueness
    const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
    if (dup) return conflict("A user with this email already exists");

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    const [created] = await db
      .insert(users)
      .values({
        companyId: data.companyId,
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
      })
      .returning();

    await db.insert(adminAuditLog).values({
      actorEmail: admin.email ?? "unknown",
      action: "create_user",
      targetType: "user",
      targetId: created.id,
      targetName: created.email,
      details: JSON.stringify({ companyId: data.companyId, companyName: company.name, role: data.role }),
    });

    return apiOk({ data: { id: created.id, name: created.name, email: created.email, role: created.role, companyId: created.companyId } }, 201);
  } catch (err) {
    console.error("POST /api/admin/users failed", err);
    return internalError();
  }
}
