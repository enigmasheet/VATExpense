export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      <div className="flex gap-4">
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
