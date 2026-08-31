import { db } from "@/lib/db";
import {
  expenses,
  companies,
  parties,
  categories,
  locations,
  trucks,
  fiscalYears,
} from "@/lib/db/schema";
import { expenseInputSchema, validateAmounts } from "@/lib/validation/expense";
import { safeParse } from "@/lib/validation/utils";
import {
  apiOk,
  badRequest,
  conflict,
  unprocessableEntity,
  notFound,
  internalError,
} from "@/lib/api-response";
import { requireCompanyIdFromSession, requireAdminRole } from "@/lib/api-auth";
import { findFiscalYearByIdAndCompany, findPartyByIdAndCompany } from "@/lib/db-helpers/entities";
import { resolveFiscalYear } from "@/lib/actions/expenses-helpers";
import { parseMiti, normalizeMiti, fyName } from "@/lib/nepali-date";
import { checkInvoiceDuplicate, findSuspiciousDuplicates } from "@/lib/expenses/duplicates";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import { and, eq, ilike, or, sql, aliasedTable, type SQL } from "drizzle-orm";

const locationAlias = aliasedTable(locations, "location");
const truckAlias = aliasedTable(trucks, "truck");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(s: string): boolean {
  return UUID_RE.test(s);
}

export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  const partyId = url.searchParams.get("partyId");
  const categoryId = url.searchParams.get("categoryId");
  const month = url.searchParams.get("month");
  const q = url.searchParams.get("q");

  const rawPage = Number(url.searchParams.get("page") ?? "1");
  const rawPageSize = Number(url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Number.isFinite(rawPageSize) && rawPageSize >= 1 ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE,
  );

  if (fiscalYearId && !isValidUUID(fiscalYearId)) return badRequest("Invalid fiscalYearId");
  if (partyId && !isValidUUID(partyId)) return badRequest("Invalid partyId");
  if (categoryId && !isValidUUID(categoryId)) return badRequest("Invalid categoryId");

  const conditions: (SQL | undefined)[] = [
    eq(expenses.companyId, companyId),
    eq(expenses.isDeleted, false),
  ];
  if (fiscalYearId) conditions.push(eq(expenses.fiscalYearId, fiscalYearId));
  if (partyId) conditions.push(eq(expenses.partyId, partyId));
  if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));
  if (month) conditions.push(eq(expenses.nepaliMonth, month));
  if (q) {
    const pattern = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(expenses.item, pattern),
        ilike(expenses.invoiceNumber, pattern),
        ilike(expenses.remarks, pattern),
      ),
    );
  }

  try {
    const where = and(
      ...conditions.filter((c): c is SQL => c !== undefined),
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(where);

    const rows = await db
      .select({
        id: expenses.id,
        companyId: expenses.companyId,
        fiscalYearId: expenses.fiscalYearId,
        partyId: expenses.partyId,
        categoryId: expenses.categoryId,
        locationId: expenses.locationId,
        truckId: expenses.truckId,
        miti: expenses.miti,
        nepaliMonth: expenses.nepaliMonth,
        invoiceNumber: expenses.invoiceNumber,
        item: expenses.item,
        quantity: expenses.quantity,
        rate: expenses.rate,
        taxableAmount: expenses.taxableAmount,
        vatAmount: expenses.vatAmount,
        totalAmount: expenses.totalAmount,
        vatRate: expenses.vatRate,
        remarks: expenses.remarks,
        rowVersion: expenses.rowVersion,
        isDeleted: expenses.isDeleted,
        deletedAt: expenses.deletedAt,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        partyName: parties.name,
        categoryName: categories.name,
        locationName: locationAlias.name,
        truckName: truckAlias.name,
      })
      .from(expenses)
      .leftJoin(parties, eq(parties.id, expenses.partyId))
      .leftJoin(categories, eq(categories.id, expenses.categoryId))
      .leftJoin(locationAlias, eq(locationAlias.id, expenses.locationId))
      .leftJoin(truckAlias, eq(truckAlias.id, expenses.truckId))
      .where(where)
      .orderBy(sql`${expenses.miti} desc, ${expenses.createdAt} desc`)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return apiOk({ data: rows, page, pageSize, total: Number(count) });
  } catch (err) {
    console.error("GET /api/expenses failed", err);
    return internalError();
  }
}

export async function POST(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const userOrError = await requireAdminRole();
  if (userOrError instanceof Response) return userOrError;
  const userId = userOrError.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = safeParse(expenseInputSchema, body);
  if (!parsed.ok) return unprocessableEntity("Validation failed", parsed.errors);

  const input = { ...parsed.data, companyId };

  try {
    // Parallel lookups for independent entities
    const [company, party, category, location, truck] = await Promise.all([
      db.select().from(companies).where(eq(companies.id, input.companyId)).limit(1).then((r) => r[0]),
      findPartyByIdAndCompany(input.partyId, input.companyId),
      input.categoryId
        ? db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.companyId, input.companyId))).limit(1).then((r) => r[0])
        : Promise.resolve({ id: input.categoryId } as { id: string }),
      input.locationId
        ? db.select({ id: locations.id }).from(locations).where(and(eq(locations.id, input.locationId), eq(locations.companyId, input.companyId))).limit(1).then((r) => r[0])
        : Promise.resolve(null),
      input.truckId
        ? db.select({ id: trucks.id }).from(trucks).where(and(eq(trucks.id, input.truckId), eq(trucks.companyId, input.companyId))).limit(1).then((r) => r[0])
        : Promise.resolve(null),
    ]);

    if (!company) return notFound("Company not found");
    if (!party) return notFound("Party not found for this company");
    if (!category) return notFound("Category not found for this company");
    if (input.locationId && !location) return notFound("Location not found for this company");
    if (input.truckId && !truck) return notFound("Truck not found for this company");

    const miti = parseMiti(input.miti);
    if (!miti.ok) return unprocessableEntity("Invalid miti", [miti.error]);

    // Resolve fiscal year — use provided ID or auto-resolve from miti
    let fiscalYearId: string;
    let resolvedFy: { startYear: number } | undefined;
    if (input.fiscalYearId) {
      const fy = await findFiscalYearByIdAndCompany(input.fiscalYearId, input.companyId);
      if (!fy) return notFound("Fiscal year not found for this company");
      fiscalYearId = fy.id;
      resolvedFy = fy;
    } else {
      const resolved = await resolveFiscalYear(input.companyId, input.miti);
      if ("error" in resolved) return notFound(resolved.error);
      fiscalYearId = resolved.fiscalYearId;
      resolvedFy = resolved.fiscalYear;
    }

    // Verify the miti falls inside the resolved fiscal year
    if (resolvedFy && miti.fiscalYear !== resolvedFy.startYear) {
      return badRequest(
        `Date ${input.miti} belongs to fiscal year ${miti.fiscalYearName}, not the selected fiscal year`,
      );
    }

    const vatRate = input.vatRate ?? company.defaultVatRate;

    // Wrap FY auto-create + expense insert + duplicate check in a transaction
    // to prevent orphaned FY records on insert failure
    const result = await db.transaction(async (tx) => {
      // If no explicit FY was provided, auto-create within the transaction
      let resolvedFiscalYearId = fiscalYearId;
      if (!input.fiscalYearId) {
        const name = fyName(miti.fiscalYear);
        const [existingFy] = await tx
          .select()
          .from(fiscalYears)
          .where(and(eq(fiscalYears.companyId, input.companyId), eq(fiscalYears.name, name)))
          .limit(1);

        if (existingFy) {
          resolvedFiscalYearId = existingFy.id;
        } else {
          const [newFy] = await tx
            .insert(fiscalYears)
            .values({
              companyId: input.companyId,
              name,
              startYear: miti.fiscalYear,
              endYear: miti.fiscalYear + 1,
              isActive: false,
            })
            .returning();
          resolvedFiscalYearId = newFy.id;
        }
      }

      const fingerprint = {
        companyId: input.companyId,
        fiscalYearId: resolvedFiscalYearId,
        partyId: input.partyId,
        invoiceNumber: input.invoiceNumber ?? null,
        miti: input.miti,
        taxableAmount: input.taxableAmount,
        vatAmount: input.vatAmount,
        totalAmount: input.totalAmount,
      };

      // Parallel duplicate checks
      const [duplicate, suspicious] = await Promise.all([
        checkInvoiceDuplicate(fingerprint),
        !input.invoiceNumber ? findSuspiciousDuplicates(fingerprint) : Promise.resolve([]),
      ]);

      if (duplicate) {
        return {
          created: null,
          warnings: [] as string[],
          duplicate,
        };
      }

      const warningList: string[] = [];
      if (suspicious.length > 0) {
        warningList.push(
          `${suspicious.length} similar expense(s) already exist without an invoice number — possibly a duplicate`,
        );
      }

      const toleranceWarnings = validateAmounts({
        quantity: input.quantity ?? null,
        rate: input.rate ?? null,
        taxableAmount: input.taxableAmount,
        vatAmount: input.vatAmount,
        totalAmount: input.totalAmount,
        vatRate,
      });
      warningList.push(...toleranceWarnings);

      const [inserted] = await tx
        .insert(expenses)
        .values({
          companyId: input.companyId,
          fiscalYearId: resolvedFiscalYearId,
          partyId: input.partyId,
          categoryId: input.categoryId,
          locationId: input.locationId ?? null,
          truckId: input.truckId ?? null,
          miti: normalizeMiti(input.miti),
          nepaliMonth: miti.monthName,
          invoiceNumber: input.invoiceNumber ?? null,
          item: input.item,
          quantity: input.quantity ?? null,
          rate: input.rate ?? null,
          taxableAmount: input.taxableAmount,
          vatAmount: input.vatAmount,
          totalAmount: input.totalAmount,
          vatRate,
          remarks: input.remarks ?? null,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        })
        .returning();

      return { created: inserted, warnings: warningList, duplicate: null as null };
    });

    if (result.duplicate) {
      const dup = result.duplicate;
      return conflict(
        dup.level === "exact"
          ? "This exact invoice has already been recorded for this party and fiscal year"
          : "An invoice with this number already exists for this party and fiscal year — review before saving",
        {
          duplicateLevel: dup.level,
          existing: dup.existing,
        },
      );
    }

    return apiOk({ data: result.created, warnings: result.warnings }, 201);
  } catch (err) {
    console.error("POST /api/expenses failed", err);
    return internalError();
  }
}