import { redirect } from "next/navigation";
import { getCompanyId, getExpenses, getParties, getCategories, getActiveFiscalYear } from "@/lib/server-data";
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

export default async function ExpensesPage({ searchParams }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 50;

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
