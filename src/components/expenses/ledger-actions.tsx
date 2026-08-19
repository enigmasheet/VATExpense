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
        loading={saving}
        disabled={pendingCount === 0}
        className="gap-1.5"
      >
        {saving ? (
          "Saving..."
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Save {pendingCount} row{pendingCount === 1 ? "" : "s"}
          </>
        )}
        <kbd className="ml-1.5 hidden rounded border border-primary-foreground/30 px-1 py-0.5 font-mono text-[10px] opacity-70 sm:inline">
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
