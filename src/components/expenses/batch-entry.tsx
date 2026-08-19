"use client";

import { useApp } from "@/lib/useApp";
import { LedgerGrid } from "@/components/expenses/ledger-grid";
import type { Party, Category } from "@/lib/expenses/ledger-types";

interface BatchEntryProps {
  allParties: Party[];
  allCategories: Category[];
}

/**
 * Renders the expense ledger for the selected company and fiscal year.
 *
 * @param allParties - Parties available for expense entries
 * @param allCategories - Expense categories available for expense entries
 * @returns The expense ledger or a prompt to create or select a fiscal year
 */
export function BatchEntry({ allParties, allCategories }: BatchEntryProps) {
  const { companyId, fiscalYearId, fiscalYears, defaultVatRate } = useApp();

  if (fiscalYears.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Create a fiscal year first — expenses are filed under one.</p>
      </div>
    );
  }

  if (!companyId || !fiscalYearId) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Select a company and fiscal year to continue.</p>
      </div>
    );
  }

  const activeFY = fiscalYears.find((fy) => fy.id === fiscalYearId);

  return (
    <LedgerGrid
      companyId={companyId}
      fiscalYearId={fiscalYearId}
      fiscalYearName={activeFY?.name ?? ""}
      allParties={allParties}
      allCategories={allCategories}
      defaultVatRate={defaultVatRate}
    />
  );
}
