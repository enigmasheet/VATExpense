import { db } from "@/lib/db";
import { expenses, categories, parties } from "@/lib/db/schema";
import { NEPALI_MONTHS } from "@/lib/nepali-date";
import { PARTY_PURCHASE_THRESHOLD } from "@/lib/constants";
import { and, eq, sql } from "drizzle-orm";

function addDecimalStrings(a: string, b: string): string {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const maxFrac = Math.max(af.length, bf.length);
  const afPadded = af.padEnd(maxFrac, "0");
  const bfPadded = bf.padEnd(maxFrac, "0");
  const intSum = BigInt(ai) + BigInt(bi);
  const fracSum = BigInt(afPadded) + BigInt(bfPadded);
  if (fracSum === 0n) return intSum.toString();
  const carry = fracSum / BigInt(10 ** maxFrac);
  const fracRemainder = fracSum % BigInt(10 ** maxFrac);
  const result = intSum + carry;
  return `${result}.${fracRemainder.toString().padStart(maxFrac, "0")}`;
}

function sumDecimals(values: string[]): string {
  return values.reduce((s, v) => (s === "0" ? v : addDecimalStrings(s, v)), "0");
}

export async function getMonthlyReport(
  companyId: string,
  fiscalYearId: string,
  nepaliMonth: string,
) {
  const categoriesData = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
      expenseCount: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .leftJoin(categories, eq(categories.id, expenses.categoryId))
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.nepaliMonth, nepaliMonth),
        eq(expenses.isDeleted, false),
      ),
    )
    .groupBy(categories.id, categories.name);

  const totals = {
    totalTaxableAmount: sumDecimals(categoriesData.map((c) => c.totalTaxableAmount)),
    totalVatAmount: sumDecimals(categoriesData.map((c) => c.totalVatAmount)),
    totalAmount: sumDecimals(categoriesData.map((c) => c.totalAmount)),
    expenseCount: categoriesData.reduce((s, c) => s + c.expenseCount, 0),
  };

  return {
    nepaliMonth,
    fiscalYearId,
    companyId,
    categories: categoriesData,
    totals,
  };
}

const NEPALI_MONTHS_ORDER = NEPALI_MONTHS;

export async function getFiscalYearReport(companyId: string, fiscalYearId: string) {
  const monthData = await db
    .select({
      nepaliMonth: expenses.nepaliMonth,
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
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
    )
    .groupBy(expenses.nepaliMonth);

  const monthsMap = new Map(monthData.map((m) => [m.nepaliMonth, m]));

  const months = NEPALI_MONTHS_ORDER.map((name) => {
    const m = monthsMap.get(name);
    return {
      nepaliMonth: name,
      totalTaxableAmount: m?.totalTaxableAmount ?? "0",
      totalVatAmount: m?.totalVatAmount ?? "0",
      totalAmount: m?.totalAmount ?? "0",
      expenseCount: m?.expenseCount ?? 0,
    };
  });

  const totals = {
    totalTaxableAmount: sumDecimals(monthData.map((m) => m.totalTaxableAmount)),
    totalVatAmount: sumDecimals(monthData.map((m) => m.totalVatAmount)),
    totalAmount: sumDecimals(monthData.map((m) => m.totalAmount)),
    expenseCount: monthData.reduce((s, m) => s + m.expenseCount, 0),
  };

  return { fiscalYearId, companyId, months, totals };
}

export async function getPartyPurchaseReport(
  companyId: string,
  fiscalYearId: string,
  basis: "taxable" | "total",
  threshold = PARTY_PURCHASE_THRESHOLD,
) {
  const basisColumn =
    basis === "taxable" ? expenses.taxableAmount : expenses.totalAmount;

  return db
    .select({
      partyId: parties.id,
      partyName: parties.name,
      vatNumber: parties.vatNumber,
      expenseCount: sql<number>`count(*)::int`,
      totalTaxableAmount: sql<string>`coalesce(sum(${expenses.taxableAmount}::numeric), 0)`,
      totalVatAmount: sql<string>`coalesce(sum(${expenses.vatAmount}::numeric), 0)`,
      totalAmount: sql<string>`coalesce(sum(${expenses.totalAmount}::numeric), 0)`,
    })
    .from(expenses)
    .innerJoin(parties, eq(parties.id, expenses.partyId))
    .where(
      and(
        eq(expenses.companyId, companyId),
        eq(expenses.fiscalYearId, fiscalYearId),
        eq(expenses.isDeleted, false),
      ),
    )
    .groupBy(parties.id, parties.name, parties.vatNumber)
    .having(sql`sum(${basisColumn}::numeric) > ${threshold}`)
    .orderBy(sql`sum(${basisColumn}::numeric) desc`);
}
