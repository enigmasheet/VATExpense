import { redirect } from "next/navigation";
import Link from "next/link";
import { getCompanyId, getExpenses, getParties, getCategories, getActiveFiscalYear } from "@/lib/server-data";
import { PATH_LOGIN, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { ExpensesListClient } from "@/components/expenses-list-client";

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    partyId?: string;
    categoryId?: string;
    month?: string;
  }>;
}

/**
 * Renders the expenses page for the authenticated company.
 *
 * @param searchParams - URL parameters used to filter and paginate expenses
 * @returns The expenses interface or a fiscal-year configuration message
 */
export default async function ExpensesPage({ searchParams }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [activeFiscalYear, parties, categories] = await Promise.all([
    getActiveFiscalYear(companyId),
    getParties(companyId),
    getCategories(companyId),
  ]);

  if (!activeFiscalYear) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Expenses</h1>
        <p className="text-sm text-muted">No fiscal year configured — create one first.</p>
        <Link
          href="/fiscal-years"
          className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 w-fit"
        >
          Create fiscal year
        </Link>
      </div>
    );
  }

  const result = await getExpenses({
    companyId,
    fiscalYearId: activeFiscalYear.id,
    partyId: params.partyId,
    categoryId: params.categoryId,
    month: params.month,
    q: params.q,
    page,
    pageSize,
  });

  return (
    <ExpensesListClient
      key={`${params.page ?? ""}-${params.q ?? ""}-${params.partyId ?? ""}-${params.categoryId ?? ""}-${params.month ?? ""}`}
      initialData={result.data.map((r) => ({
        ...r,
        partyName: r.partyName ?? "",
        categoryName: r.categoryName ?? "",
      }))}
      initialPage={result.page}
      initialTotal={result.total}
      pageSize={result.pageSize}
      fiscalYearName={activeFiscalYear.name}
      parties={parties.map((p) => ({ id: p.id, name: p.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
