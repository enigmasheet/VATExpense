import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  variant?: "table" | "cards" | "stats" | "form";
  rows?: number;
  columns?: number;
}

function HeaderBlock() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
    </div>
  );
}

/**
 * Renders a loading placeholder matching common page layouts.
 *
 * @param variant - The layout to mimic: table, cards, stats, or form
 * @param rows - Number of placeholder rows or items
 * @param columns - Number of placeholder columns in a table row
 */
export function PageSkeleton({ variant = "table", rows = 5, columns = 4 }: PageSkeletonProps) {
  const table = (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-border px-4 py-3 last:border-b-0">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className={`h-4 ${j === 0 ? "w-1/4" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );

  if (variant === "cards") {
    return (
      <div className="flex flex-col gap-6">
        <HeaderBlock />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className="flex flex-col gap-6">
        <HeaderBlock />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
        {table}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="flex flex-col gap-6">
        <HeaderBlock />
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <HeaderBlock />
      {table}
    </div>
  );
}