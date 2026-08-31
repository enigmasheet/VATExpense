import { db } from "@/lib/db";
import { expenses, parties, categories, importBatches } from "@/lib/db/schema";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { findExpenseById } from "@/lib/db-helpers/expenses";
import { and, eq, sql } from "drizzle-orm";

/**
 * Summarizes expenses for a company and fiscal year, including aggregate totals and recent expenses.
 *
 * @param companyId - The company identifier
 * @param fiscalYearId - The fiscal year identifier
 * @returns Aggregate taxable, VAT, and total amounts with the expense count, plus the five most recent expenses
 */
export async function getDashboardSummary(companyId: string, fiscalYearId: string) {
  const [totals] = await db
    .select({
      taxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      vatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
      expenseCount: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    );

  const recent = await db
    .select({
      id: expenses.id,
      miti: expenses.miti,
      invoiceNumber: expenses.invoiceNumber,
      item: expenses.item,
      totalAmount: expenses.totalAmount,
      partyName: parties.name,
    })
    .from(expenses)
    .leftJoin(parties, eq(parties.id, expenses.partyId))
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    )
    .orderBy(sql`
      CASE
        WHEN ${expenses.miti} ~ '^\\d{2}/\\d{2}/\\d{4}$'
          THEN substring(${expenses.miti} from 7 for 4)
            || substring(${expenses.miti} from 4 for 2)
            || substring(${expenses.miti} from 1 for 2)
        ELSE ${expenses.miti}
      END DESC,
      CAST(${expenses.invoiceNumber} AS NUMERIC) DESC NULLS LAST,
      ${expenses.createdAt} DESC
    `)
    .limit(5);

  return { totals, recent };
}

/**
 * Paginated expenses list with filters.
 */
export interface ExpenseListParams {
  companyId: string;
  fiscalYearId?: string;
  partyId?: string;
  categoryId?: string;
  month?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves paginated, non-deleted expenses for a company with optional filters and related party and category names.
 *
 * @param params - Company context, optional expense filters, and pagination settings.
 * @returns The matching expense rows, current page, page size, and total matching count.
 */
export async function getExpenses(params: ExpenseListParams) {
  const {
    companyId,
    fiscalYearId,
    partyId,
    categoryId,
    month,
    q,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  const conditions = [
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
      sql`(${expenses.item} ilike ${pattern} or ${expenses.invoiceNumber} ilike ${pattern} or ${expenses.remarks} ilike ${pattern})`,
    );
  }

  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(where);

  const rows = await db
    .select({
      id: expenses.id,
      miti: expenses.miti,
      nepaliMonth: expenses.nepaliMonth,
      invoiceNumber: expenses.invoiceNumber,
      item: expenses.item,
      taxableAmount: expenses.taxableAmount,
      vatAmount: expenses.vatAmount,
      totalAmount: expenses.totalAmount,
      rowVersion: expenses.rowVersion,
      partyId: expenses.partyId,
      partyName: parties.name,
      categoryName: categories.name,
    })
    .from(expenses)
    .leftJoin(parties, eq(parties.id, expenses.partyId))
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .where(where)
    .orderBy(sql`
      CASE
        WHEN ${expenses.miti} ~ '^\\d{2}/\\d{2}/\\d{4}$'
          THEN substring(${expenses.miti} from 7 for 4)
            || substring(${expenses.miti} from 4 for 2)
            || substring(${expenses.miti} from 1 for 2)
        ELSE ${expenses.miti}
      END DESC,
      CAST(${expenses.invoiceNumber} AS NUMERIC) DESC NULLS LAST,
      ${expenses.createdAt} DESC
    `)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data: rows, page, pageSize, total: Number(count) };
}

/**
 * Retrieves a single expense with its related party and category names, scoped to a company.
 *
 * @returns The matching expense, or `null` if no expense has the specified ID.
 */
export async function getExpenseById(id: string, companyId: string) {
  return findExpenseById(id, companyId);
}

export interface DashboardAlert {
  kind: "warning" | "info";
  text: string;
}

export async function getDashboardAlerts(
  companyId: string,
  fiscalYearId: string,
): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];

  const [missingInvoiceCount, pendingBatchCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, companyId),
          eq(expenses.fiscalYearId, fiscalYearId),
          eq(expenses.isDeleted, false),
          sql`${expenses.invoiceNumber} IS NULL`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.companyId, companyId),
          eq(importBatches.status, "pending"),
        ),
      ),
  ]);

  if (missingInvoiceCount[0].count > 0) {
    const n = missingInvoiceCount[0].count;
    alerts.push({
      kind: "warning",
      text: `${n} expense${n === 1 ? " has" : "s have"} no invoice number recorded.`,
    });
  }

  if (pendingBatchCount[0].count > 0) {
    const n = pendingBatchCount[0].count;
    alerts.push({
      kind: "info",
      text: `${n} import batch${n === 1 ? " is" : "es are"} awaiting confirmation.`,
    });
  }

  return alerts;
}
