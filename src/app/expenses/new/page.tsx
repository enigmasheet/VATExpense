"use client";

import { BatchEntry } from "@/components/expenses/batch-entry";

export default function NewExpensePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Quick Add</h1>
        <p className="mt-1 text-sm text-muted">
          Enter multiple invoices quickly. Type a VAT number to auto-resolve the party, fill the amount, and queue it up.
        </p>
      </div>
      <BatchEntry />
    </div>
  );
}
