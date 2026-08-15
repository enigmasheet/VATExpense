import type { SaveResult } from "@/hooks/expenses/use-ledger-save";
import { Button } from "@/components/ui/button";

interface LedgerActionsProps {
  saving: boolean;
  pendingCount: number;
  savedCount: number;
  saveResult: SaveResult | null;
  onAddRow: () => void;
  onSave: () => void;
  onClearSaved: () => void;
}

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
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        onClick={onAddRow}
        className="gap-1.5"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add row
      </Button>
      <Button
        onClick={onSave}
        disabled={saving || pendingCount === 0}
        className="gap-1.5"
      >
        {saving ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Save {pendingCount} row{pendingCount === 1 ? "" : "s"}
          </>
        )}
        <kbd className="ml-1.5 rounded border border-primary-foreground/30 px-1 py-0.5 font-mono text-[10px] opacity-70">
          Ctrl+Enter
        </kbd>
      </Button>
      {saveResult && (
        <span className="text-sm text-muted-foreground">
          {saveResult.saved} saved{saveResult.errors > 0 ? `, ${saveResult.errors} error(s)` : ""}
        </span>
      )}
      {savedCount > 0 && (
        <Button
          variant="secondary"
          onClick={onClearSaved}
          className="gap-1.5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear saved ({savedCount})
        </Button>
      )}
    </div>
  );
}
