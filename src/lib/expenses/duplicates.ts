import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { amountsClose } from "@/lib/money";
import { and, eq } from "drizzle-orm";

export type DuplicateLevel = "exact" | "invoice";

export interface ExpenseFingerprint {
  companyId: string;
  fiscalYearId: string;
  partyId: string;
  invoiceNumber: string | null;
  miti: string;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
}

/**
 * Level 1/2 — same Company + FiscalYear + Party + InvoiceNumber.
 * - exact: amounts and Miti all match → hard block.
 * - invoice: identity key matches but details differ → still blocks (the DB
 *   constraint would reject it anyway), but worded as "review this".
 */
export async function checkInvoiceDuplicate(
  fingerprint: ExpenseFingerprint,
): Promise<{ level: DuplicateLevel; existing: (typeof expenses.$inferSelect) } | null> {
  if (!fingerprint.invoiceNumber) return null;

  const existing = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, fingerprint.companyId),
        eq(expenses.fiscalYearId, fingerprint.fiscalYearId),
        eq(expenses.partyId, fingerprint.partyId),
        eq(expenses.invoiceNumber, fingerprint.invoiceNumber),
      ),
    )
    .limit(1);

  if (existing.length === 0) return null;

  const e = existing[0];
  const exact =
    e.miti === fingerprint.miti &&
    amountsClose(Number(e.taxableAmount), Number(fingerprint.taxableAmount)) &&
    amountsClose(Number(e.vatAmount), Number(fingerprint.vatAmount)) &&
    amountsClose(Number(e.totalAmount), Number(fingerprint.totalAmount));

  return { level: exact ? "exact" : "invoice", existing: e };
}

/**
 * Level 3 — no invoice number: same Party + Miti + amounts within tolerance.
 * Returns candidates as warnings, never a hard block (avoids false positives
 * on two unrelated round-number invoices).
 */
export async function findSuspiciousDuplicates(
  fingerprint: ExpenseFingerprint,
): Promise<(typeof expenses.$inferSelect)[]> {
  if (fingerprint.invoiceNumber) return [];

  const candidates = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, fingerprint.companyId),
        eq(expenses.fiscalYearId, fingerprint.fiscalYearId),
        eq(expenses.partyId, fingerprint.partyId),
        eq(expenses.miti, fingerprint.miti),
        eq(expenses.isDeleted, false),
      ),
    )
    .limit(20);

  return candidates.filter(
    (e) =>
      amountsClose(Number(e.taxableAmount), Number(fingerprint.taxableAmount)) &&
      amountsClose(Number(e.vatAmount), Number(fingerprint.vatAmount)) &&
      amountsClose(Number(e.totalAmount), Number(fingerprint.totalAmount)),
  );
}