import { db } from "@/lib/db";
import { companies, users, fiscalYears } from "@/lib/db/schema";
import { provisionCompanySchema } from "@/lib/validation/admin";
import { safeParse } from "@/lib/validation/utils";
import { fromEnglishDate } from "@/lib/nepali-date";
import {
  apiOk,
  unauthorized,
  badRequest,
  conflict,
  unprocessableEntity,
  internalError,
} from "@/lib/api-response";
import { getSessionUser } from "@/lib/api-auth";
import { eq, ilike, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

function requireSuperAdmin() {
  return getSessionUser().then((u) => {
    if (!u || u.role !== "SuperAdmin") return null;
    return u;
  });
}

/**
 * Lists all companies (superadmin only).
 */
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return unauthorized();

  try {
    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        vatNumber: companies.vatNumber,
        defaultVatRate: companies.defaultVatRate,
        createdAt: companies.createdAt,
        userCount: sql<number>`count(${users.id})::int`,
      })
      .from(companies)
      .leftJoin(users, eq(users.companyId, companies.id))
      .groupBy(companies.id)
      .orderBy(companies.name);
    return apiOk({ data: rows });
  } catch {
    return internalError();
  }
}

/**
 * Provisions a new company with an admin user and active fiscal year (superadmin only).
 *
 * One transaction: company → user (bcrypt) → active FY from today's BS date.
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

  const parsed = safeParse(provisionCompanySchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const { company: companyData, user: userData } = parsed.data;

  try {
    // Dedupe: company by name (ilike)
    const existingCompany = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(ilike(companies.name, companyData.name))
      .limit(1);
    if (existingCompany.length > 0) {
      return conflict("A company with this name already exists", {
        existing: existingCompany[0],
      });
    }

    // Dedupe: user by email
    const existingUser = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);
    if (existingUser.length > 0) {
      return conflict("A user with this email already exists", {
        existing: existingUser[0],
      });
    }

    // Derive active fiscal year from today's BS date
    const today = fromEnglishDate(new Date());

    const result = await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({
          name: companyData.name,
          vatNumber: companyData.vatNumber ?? null,
          address: companyData.address ?? null,
          phone: companyData.phone ?? null,
          email: companyData.email ?? null,
          defaultVatRate: companyData.defaultVatRate,
        })
        .returning();

      const passwordHash = await bcrypt.hash(userData.password, 10);

      const [user] = await tx
        .insert(users)
        .values({
          companyId: company.id,
          email: userData.email,
          name: userData.name,
          passwordHash,
          role: userData.role,
        })
        .returning();

      // Deactivate any existing FYs (shouldn't exist for new company, but defensive)
      await tx
        .update(fiscalYears)
        .set({ isActive: false })
        .where(eq(fiscalYears.companyId, company.id));

      const [fy] = await tx
        .insert(fiscalYears)
        .values({
          companyId: company.id,
          name: today.fiscalYearName,
          startYear: today.fiscalYear,
          endYear: today.fiscalYear + 1,
          isActive: true,
        })
        .returning();

      return { companyId: company.id, userId: user.id, fiscalYearId: fy.id, fiscalYearName: fy.name };
    });

    return apiOk({ data: result }, 201);
  } catch (err) {
    console.error("POST /api/admin/companies failed", err);
    return internalError();
  }
}
