import { formatAmount } from "@/lib/format";
import { VAT_RATE } from "@/lib/constants";
import { StatCard } from "@/components/ui/stat-card";
import type { LedgerTotals } from "@/lib/expenses/ledger-types";

interface LedgerSummaryProps {
  totals: LedgerTotals;
  rowCount: number;
  errorCount?: number;
  duplicateCount?: number;
}

export function LedgerSummary({ totals, rowCount, errorCount = 0, duplicateCount = 0 }: LedgerSummaryProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard size="sm" label="Taxable (Excl. VAT)" value={formatAmount(totals.taxable)} />
        <StatCard size="sm" label={`VAT (${VAT_RATE}%)`} value={formatAmount(totals.vat)} />
        <StatCard size="sm" label="Total (Incl. VAT)" value={formatAmount(totals.total)} accent />
      </div>
      <p className="text-xs text-muted-foreground">
        {rowCount} row{rowCount !== 1 ? "s" : ""} — {totals.count} ready to save
        {errorCount > 0 && (
          <span className="ml-2 text-red-600">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
        )}
        {duplicateCount > 0 && (
          <span className="ml-2 text-amber-600">{duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""}</span>
        )}
      </p>
    </div>
  );
}
