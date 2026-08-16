import { db } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";
import { apiOk, unauthorized, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
import { desc, sql } from "drizzle-orm";

function requireSuperAdmin() {
  return getSessionUser().then((u) => {
    if (!u || u.role !== ROLE_SUPER_ADMIN) return null;
    return u;
  });
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize")) || 50), 100);
  const offset = (page - 1) * pageSize;

  try {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminAuditLog);

    const rows = await db
      .select()
      .from(adminAuditLog)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(pageSize)
      .offset(offset);

    return apiOk({
      data: rows,
      page,
      pageSize,
      total: countRow?.count ?? 0,
    });
  } catch {
    return internalError();
  }
}
