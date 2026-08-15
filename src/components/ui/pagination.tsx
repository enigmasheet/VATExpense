"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizes?: number[];
  basePath?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizes = [25, 50, 100, 200],
  basePath = "",
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildUrl = useCallback(
    (overrides: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value === "" || value === undefined || value === null) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      return `${basePath}${qs ? `?${qs}` : ""}`;
    },
    [searchParams, basePath],
  );

  function goToPage(p: number) {
    router.push(buildUrl({ page: p }));
  }

  function changePageSize(size: number) {
    router.push(buildUrl({ pageSize: size, page: 1 }));
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Generate page numbers to show
  const pageNumbers: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pageNumbers.push(i);
    }
    if (page < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing {startItem}-{endItem} of {total}
        </span>
        <select
          value={pageSize}
          onChange={(e) => changePageSize(Number(e.target.value))}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          Previous
        </Button>

        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "primary" : "secondary"}
              size="sm"
              onClick={() => goToPage(p)}
              className="min-w-8"
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
