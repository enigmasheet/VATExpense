import { db } from "@/lib/db";
import {
  expenses,
  companies,
  parties,
  categories,
  locations,
  trucks,
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
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { findFiscalYearByIdAndCompany, findPartyByIdAndCompany } from "@/lib/db-helpers/entities";
import { parseMiti } from "@/lib/nepali-date";
import { checkInvoiceDuplicate, findSuspiciousDuplicates } from "@/lib/expenses/duplicates";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import { and, eq, ilike, or, sql, aliasedTable, type SQL } from "drizzle-orm";

const locationAlias = aliasedTable(locations, "location");
const truckAlias = aliasedTable(trucks, "truck");

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
    const company = (
      await db.select().from(companies).where(eq(companies.id, input.companyId)).limit(1)
    )[0];
    if (!company) return notFound("Company not found");

    const fiscalYear = await findFiscalYearByIdAndCompany(input.fiscalYearId, input.companyId);
    if (!fiscalYear) return notFound("Fiscal year not found for this company");

    const party = await findPartyByIdAndCompany(input.partyId, input.companyId);
    if (!party) return notFound("Party not found for this company");

    const vatRate = input.vatRate ?? company.defaultVatRate;

    const fingerprint = {
      companyId: input.companyId,
      fiscalYearId: input.fiscalYearId,
      partyId: input.partyId,
      invoiceNumber: input.invoiceNumber ?? null,
      miti: input.miti,
      taxableAmount: input.taxableAmount,
      vatAmount: input.vatAmount,
      totalAmount: input.totalAmount,
    };

    const duplicate = await checkInvoiceDuplicate(fingerprint);
    if (duplicate) {
      return conflict(
        duplicate.level === "exact"
          ? "This exact invoice has already been recorded for this party and fiscal year"
          : "An invoice with this number already exists for this party and fiscal year — review before saving",
        {
          duplicateLevel: duplicate.level,
          existing: duplicate.existing,
        },
      );
    }

    const warnings: string[] = [];
    if (!input.invoiceNumber) {
      const suspicious = await findSuspiciousDuplicates(fingerprint);
      if (suspicious.length > 0) {
        warnings.push(
          `${suspicious.length} similar expense(s) already exist without an invoice number — possibly a duplicate`,
        );
      }
    }

    const toleranceWarnings = validateAmounts({
      quantity: input.quantity ?? null,
      rate: input.rate ?? null,
      taxableAmount: input.taxableAmount,
      vatAmount: input.vatAmount,
      totalAmount: input.totalAmount,
      vatRate,
    });
    warnings.push(...toleranceWarnings);

    const miti = parseMiti(input.miti);
    if (!miti.ok) return unprocessableEntity("Invalid miti", [miti.error]);

    const [created] = await db
      .insert(expenses)
      .values({
        companyId: input.companyId,
        fiscalYearId: input.fiscalYearId,
        partyId: input.partyId,
        categoryId: input.categoryId,
        locationId: input.locationId ?? null,
        truckId: input.truckId ?? null,
        miti: input.miti,
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
      })
      .returning();

    return apiOk({ data: created, warnings }, 201);
  } catch (err) {
    console.error("POST /api/expenses failed", err);
    return internalError();
  }
}