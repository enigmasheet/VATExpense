import type { LedgerRowStatus } from "@/lib/expenses/ledger-types";
import {
  STATUS_SAVED,
  STATUS_SAVING,
  STATUS_ERROR,
  STATUS_DUPLICATE,
  STATUS_INCOMPLETE,
} from "@/lib/status-constants";
import { Badge } from "@/components/ui/badge";

/**
 * Renders a visual status badge for a ledger row.
 */
export function StatusBadge({ status }: { status: LedgerRowStatus }) {
  if (status === STATUS_SAVED) {
    return (
      <Badge tone="success" className="gap-1">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Saved
      </Badge>
    );
  }
  if (status === STATUS_SAVING) {
    return (
      <Badge tone="primary" className="gap-1">
        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Saving...
      </Badge>
    );
  }
  if (status === STATUS_ERROR) {
    return (
      <Badge tone="danger" className="gap-1">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Error
      </Badge>
    );
  }
  if (status === STATUS_DUPLICATE) {
    return (
      <span title="Duplicate invoice for this party">
        <Badge tone="warning">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </Badge>
      </span>
    );
  }
  if (status === STATUS_INCOMPLETE) {
    return <Badge tone="outline">Incomplete</Badge>;
  }
  return <Badge tone="outline">Pending</Badge>;
}