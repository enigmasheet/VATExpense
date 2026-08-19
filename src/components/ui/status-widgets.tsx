import type { ReactNode } from "react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={`rounded-lg border border-border/60 bg-surface p-8 text-center text-sm text-muted ${className}`}
    >
      {message}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`rounded-lg border border-dashed border-border/60 bg-surface p-8 text-center ${className}`}>
      {icon && <div className="mx-auto mb-3 text-muted">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
