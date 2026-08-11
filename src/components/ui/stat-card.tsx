import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  size?: "sm" | "md" | "lg";
  accent?: boolean;
}

/**
 * Renders a labelled statistic card with a large tabular value.
 *
 * @param label - Text displayed above the value
 * @param value - The statistic value
 * @param size - Controls card padding density
 * @param accent - Highlights the value in the primary colour
 */
export function StatCard({ label, value, size = "lg", accent = false }: StatCardProps) {
  if (size === "sm") {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-primary" : ""}`}
        >
          {value}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`tabular-amount mt-2 text-2xl font-semibold ${
          accent ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
