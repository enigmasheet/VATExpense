"use client";

import { use, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { ExpenseForm, type ExpenseInitial } from "@/components/expenses/expense-form";
import { formatAmount } from "@/lib/format";

/**
 * Displays an expense for editing, including its current details and row version.
 *
 * @param params - A promise containing the expense route identifier
 */
export default function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [expense, setExpense] = useState<ExpenseInitial & { rowVersion: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: ExpenseInitial & { rowVersion: number } }>(`/api/expenses/${id}`)
      .then(({ data }) => setExpense(data))
      .catch((e: ApiError) => setError(e.detail));
  }, [id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!expense) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit expense</h1>
        <p className="mt-1 text-sm text-muted">
          {expense.item} · {formatAmount(expense.totalAmount)}
        </p>
      </div>
      <ExpenseForm
        mode="edit"
        expenseId={id}
        initial={expense}
        initialRowVersion={expense.rowVersion}
      />
    </div>
  );
}