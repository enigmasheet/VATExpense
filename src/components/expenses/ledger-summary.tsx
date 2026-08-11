import { formatAmount } from "@/lib/format";
import { VAT_RATE } from "@/lib/constants";
import type { LedgerTotals } from "@/lib/expenses/ledger-types";

interface LedgerSummaryProps {
  totals: LedgerTotals;
  rowCount: number;
}

/**
 * Renders summary cards and row count for the expense ledger.
 */
export function LedgerSummary({ totals, rowCount }: LedgerSummaryProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Taxable (Excl. VAT)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {formatAmount(totals.taxable)}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            VAT ({VAT_RATE}%)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-muted-foreground">
            {formatAmount(totals.vat)}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total (Incl. VAT)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {formatAmount(totals.total)}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {rowCount} row{rowCount !== 1 ? "s" : ""} — {totals.count} ready to save
      </div>
    </>
  );
}
