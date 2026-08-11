"use client";

import { ExpenseForm } from "@/components/expenses/expense-form";

export default function NewExpensePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">New expense</h1>
        <p className="mt-1 text-sm text-muted">
          Enter the invoice as written — calculated amounts are only advisory and never override them.
        </p>
      </div>
      <ExpenseForm mode="create" />
    </div>
  );
}