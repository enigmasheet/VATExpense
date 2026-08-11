import { redirect } from "next/navigation";
import { getCompanyId, getParties, getCategories } from "@/lib/server-data";
import { BatchEntry } from "@/components/expenses/batch-entry";

/**
 * Renders the page for entering multiple expenses.
 */
export default async function NewExpensePage() {
  const companyId = await getCompanyId();
  if (!companyId) redirect("/login");

  const [parties, categories] = await Promise.all([
    getParties(companyId),
    getCategories(companyId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Add Expense</h1>
      </div>
      <BatchEntry
        allParties={parties.map((p) => ({
          id: p.id,
          name: p.name,
          vatNumber: p.vatNumber,
          locationId: p.locationId,
          locationName: p.locationName,
        }))}
        allCategories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
