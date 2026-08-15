export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col gap-4">
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
