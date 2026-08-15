import { db } from "@/lib/db";
import { trucks } from "@/lib/db/schema";
import { createTruckSchema } from "@/lib/validation/masters";
import { safeParse } from "@/lib/validation/utils";
import { apiOk, badRequest, conflict, unprocessableEntity, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { normalizeName } from "@/lib/normalize";
import { and, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  try {
    const rows = await db
      .select()
      .from(trucks)
      .where(eq(trucks.companyId, companyId))
      .orderBy(trucks.name);
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

  const parsed = safeParse(createTruckSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  try {
    const { name, ownerName, truckType, isActive } = parsed.data;
    const normalizedName = normalizeName(name);

    const existing = await db
      .select({ id: trucks.id, name: trucks.name })
      .from(trucks)
      .where(
        and(eq(trucks.companyId, companyId), eq(trucks.normalizedName, normalizedName)),
      )
      .limit(1);
    if (existing.length > 0) {
      return conflict(`Truck "${name}" already exists`, { existing: existing[0] });
    }

    const [created] = await db
      .insert(trucks)
      .values({ companyId, name, normalizedName, ownerName: ownerName ?? null, truckType: truckType ?? null, isActive })
      .returning();
    return apiOk({ data: created }, 201);
  } catch (err) {
    console.error("POST /api/trucks failed", err);
    return internalError();
  }
}
