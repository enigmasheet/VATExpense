import { redirect } from "next/navigation";
import { getCompanyId } from "@/lib/server-data";
import { PATH_LOGIN } from "@/lib/constants";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function CreateExpensePage() {
  const companyId = await getCompanyId();
  if (!companyId) redirect(PATH_LOGIN);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">New Expense</h1>
        <p className="mt-1 text-sm text-muted">Record a single expense with full details.</p>
      </div>
      <ExpenseForm mode="create" />
    </div>
  );
}
