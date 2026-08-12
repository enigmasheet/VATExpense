import { db } from "@/lib/db";
import { apiOk, notFound, unauthorized, internalError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { ROLE_SUPER_ADMIN } from "@/lib/constants";
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
  if (!admin || admin.role !== ROLE_SUPER_ADMIN) return unauthorized();

  try {
    await db.execute(
      sql`DO $$ DECLARE t TEXT; tables TEXT[] := ARRAY['companies','users','fiscal_years','locations','categories','parties','expenses','import_batches','import_batch_rows']; BEGIN FOREACH t IN ARRAY tables LOOP IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN EXECUTE format('TRUNCATE TABLE %I CASCADE', t); END IF; END LOOP; END $$`,
    );
    return apiOk({ data: { ok: true } });
  } catch (err) {
    console.error("POST /api/admin/reset failed", err);
    return internalError();
  }
}
