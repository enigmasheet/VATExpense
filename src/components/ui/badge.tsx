import type { ReactNode } from "react";

type Tone = "default" | "primary" | "warning" | "danger" | "success" | "outline";

const tones: Record<Tone, string> = {
  default: "bg-surface-hover text-muted",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  success: "bg-success-bg text-success",
  outline: "bg-transparent text-muted ring-1 ring-inset ring-border",
};

/**
 * Renders content in a styled label with the selected tone.
 *
 * @param tone - The visual tone of the badge.
 * @param className - Additional classes appended to the badge.
 * @param children - The content displayed inside the badge.
 */
export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}