import { redirect } from "next/navigation";
import { getCompanyId, getSessionUser, getCompany, getActiveFiscalYear, getDashboardSummary } from "@/lib/server-data";
import { ROLE_SUPER_ADMIN, PATH_LOGIN, PATH_ADMIN } from "@/lib/constants";
import { DashboardClient } from "@/components/dashboard-client";

/**
 * Renders the company dashboard for the active fiscal year.
 *
 * Redirects superadmins to the admin area. Redirects unauthenticated users to login.
 * Prompts to configure a fiscal year when none is active.
 */
export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser?.role === ROLE_SUPER_ADMIN) redirect(PATH_ADMIN);

  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  const [company, activeFiscalYear] = await Promise.all([
    getCompany(companyId),
    getActiveFiscalYear(companyId),
  ]);

  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {company?.name ?? "VAT Expense Ledger"}
        </h1>
        <p className="text-sm text-muted">
          No fiscal year configured yet — create one to start recording expenses.
        </p>
      </div>
    );
  }

  const summary = await getDashboardSummary(companyId, activeFiscalYear.id);

  return (
    <DashboardClient
      companyName={company?.name ?? "VAT Expense Ledger"}
      fiscalYearName={activeFiscalYear.name}
      totals={summary.totals}
      recent={summary.recent.map((r) => ({
        ...r,
        partyName: r.partyName ?? "",
      }))}
    />
  );
}
