import type { ReactNode } from "react";

type StatusTone = "success" | "danger" | "warning" | "default";

const dotClasses: Record<StatusTone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  default: "bg-muted",
};

const textClasses: Record<StatusTone, string> = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  default: "text-muted",
};

interface StatusDotProps {
  tone?: StatusTone;
  label: ReactNode;
}

/**
 * Renders a small status indicator: a colored dot paired with a label.
 *
 * @param tone - The semantic color of the dot and label
 * @param label - The status text or element
 */
export function StatusDot({ tone = "default", label }: StatusDotProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textClasses[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
      {label}
    </span>
  );
}