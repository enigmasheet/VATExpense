import type { SaveResult } from "@/hooks/expenses/use-ledger-save";

interface LedgerActionsProps {
  saving: boolean;
  pendingCount: number;
  savedCount: number;
  saveResult: SaveResult | null;
  onAddRow: () => void;
  onSave: () => void;
  onClearSaved: () => void;
}

/**
 * Renders the add/save/clear action buttons for the expense ledger.
 */
export function LedgerActions({
  saving,
  pendingCount,
  savedCount,
  saveResult,
  onAddRow,
  onSave,
  onClearSaved,
}: LedgerActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onAddRow}
        className="inline-flex items-center gap-1.5 rounded border border-dashed border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add row
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || pendingCount === 0}
        className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        {saving ? "Saving..." : `Save ${pendingCount} row${pendingCount === 1 ? "" : "s"}`}
        <kbd className="ml-2 rounded border border-primary-foreground/30 px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl+Enter
        </kbd>
      </button>
      {saveResult && (
        <span className="text-sm text-muted-foreground">
          {saveResult.saved} saved{saveResult.errors > 0 ? `, ${saveResult.errors} error(s)` : ""}
        </span>
      )}
      {savedCount > 0 && (
        <button
          type="button"
          onClick={onClearSaved}
          className="inline-flex items-center gap-1.5 rounded border border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          Clear saved ({savedCount})
        </button>
      )}
    </div>
  );
}
