import { apiOk, badRequest, internalError } from "@/lib/api-response";
import { requireCompanyIdFromSession } from "@/lib/api-auth";
import { getPartyStatement } from "@/lib/server-data/party-statement";

/**
 * Returns the party statement: all transactions for a party in a fiscal year.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: partyId } = await params;
  const companyId = await requireCompanyIdFromSession(request);
  if (typeof companyId !== "string") return companyId;

  const url = new URL(request.url);
  const fiscalYearId = url.searchParams.get("fiscalYearId");

  if (!fiscalYearId) return badRequest("fiscalYearId query parameter is required");

  try {
    const { summary, rows } = await getPartyStatement(companyId, partyId, fiscalYearId);
    return apiOk({ data: { summary, rows } });
  } catch (err) {
    console.error("GET /api/reports/parties/[id] failed", err);
    return internalError();
  }
}
