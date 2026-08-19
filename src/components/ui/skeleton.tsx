import type { ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className = "", children }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-lg bg-surface-muted ${className}`}>
      {children}
    </div>
  );
}
