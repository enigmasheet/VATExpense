"use client";

import { ExpenseForm, type ExpenseInitial } from "@/components/expenses/expense-form";
import { formatAmount } from "@/lib/format";

interface ExpenseDetailClientProps {
  id: string;
  initial: ExpenseInitial & { rowVersion: number };
  partyName: string;
  categoryName: string;
}

export function ExpenseDetailClient({
  id,
  initial,
  partyName,
  categoryName,
}: ExpenseDetailClientProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit expense</h1>
        <p className="mt-1 text-sm text-muted">
          {initial.item} · {formatAmount(initial.totalAmount)}
        </p>
      </div>
      <ExpenseForm
        mode="edit"
        expenseId={id}
        initial={initial}
        initialRowVersion={initial.rowVersion}
      />
    </div>
  );
}
