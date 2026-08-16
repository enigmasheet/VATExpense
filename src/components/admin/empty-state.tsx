import type { ReactNode } from "react";
import { NavIcon } from "@/components/layout/icons";

interface EmptyStateProps {
  icon?: "management" | "dashboard" | "fiscalYears" | "parties" | "calendarDays";
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Renders a centered empty-state block with an optional icon, title,
 * description, and call-to-action.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      {icon && (
        <span className="rounded-full bg-surface-muted p-3 text-muted">
          <NavIcon name={icon} className="h-6 w-6" />
        </span>
      )}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}