"use client";

import { useApp } from "@/lib/use-app";
import { LedgerGrid } from "@/components/expenses/ledger-grid";

interface Party {
  id: string;
  name: string;
  vatNumber: string | null;
  locationId: string | null;
  locationName: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface BatchEntryProps {
  allParties: Party[];
  allCategories: Category[];
}

export function BatchEntry({ allParties, allCategories }: BatchEntryProps) {
  const { companyId, fiscalYearId, fiscalYears } = useApp();

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
    />
  );
}
