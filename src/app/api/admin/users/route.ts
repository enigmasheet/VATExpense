import { db } from "@/lib/db";
import { users, companies } from "@/lib/db/schema";
import { apiOk, unauthorized, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
import { eq } from "drizzle-orm";

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
