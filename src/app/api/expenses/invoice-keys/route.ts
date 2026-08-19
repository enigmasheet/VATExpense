import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { and, eq, isNotNull } from "drizzle-orm";

/**
 * Returns only the invoice keys (partyId + invoiceNumber) for a given
 * company and fiscal year. Lightweight alternative to fetching full
 * expense rows just for duplicate detection.
 */
export async function GET(request: Request) {
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");
  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");

  try {
    const rows = await db
      .select({
        partyId: expenses.partyId,
        invoiceNumber: expenses.invoiceNumber,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, companyId),
          eq(expenses.fiscalYearId, fiscalYearId),
          eq(expenses.isDeleted, false),
          isNotNull(expenses.invoiceNumber),
        ),
      )
      .limit(10000);

    const keys = rows.map((r) => ({
      partyId: r.partyId,
      invoiceNumber: r.invoiceNumber as string,
    }));

    return apiOk({ data: keys });
  } catch (err) {
    console.error("GET /api/expenses/invoice-keys failed", err);
    return internalError();
  }
}
