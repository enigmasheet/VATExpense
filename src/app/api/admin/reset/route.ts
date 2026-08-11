import { db } from "@/lib/db";
import { apiOk, notFound, unauthorized, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/server-data";
import { sql } from "drizzle-orm";

/**
 * Truncates all data tables (superadmin only, gated by ALLOW_DB_RESET=true).
 *
 * When the env flag is not set, returns 404 to hide the endpoint entirely.
 */
export async function POST() {
  if (process.env.ALLOW_DB_RESET !== "true") {
    return notFound("Reset endpoint is not enabled");
  }

  const admin = await getSessionUser();
  if (!admin || admin.role !== "SuperAdmin") return unauthorized();

  try {
    await db.execute(
      sql`TRUNCATE TABLE "companies","users","fiscal_years","locations","categories","parties","expenses","import_batches","import_batch_rows" CASCADE`,
    );
    return apiOk({ data: { ok: true } });
  } catch (err) {
    console.error("POST /api/admin/reset failed", err);
    return internalError();
  }
}
