import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHeader's title/description/action row so route loading
 * states don't shift layout once the real header replaces it. */
export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      {withAction && <Skeleton className="h-8 w-28" />}
    </div>
  );
}

/** Matches the sm:grid-cols-N StatCard rows used on dashboard/report pages. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="gap-3">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="size-11 shrink-0 rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** A table-shaped skeleton: header bar + N placeholder rows, same row
 * height as real table rows so the swap-in doesn't shift the page. */
export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-4 border-b bg-sky-50 px-4 py-3 dark:bg-muted/40">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Search bar + filter row skeleton, shown above list-page tables. */
export function FilterBarSkeleton({ filters = 2 }: { filters?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Skeleton className="h-8 w-full max-w-sm" />
      {Array.from({ length: filters }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full sm:w-40" />
      ))}
    </div>
  );
}

/** A labeled-field stack for new/edit form pages. */
export function FormFieldsSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/** Matches the public product grid (2/3/4-column card layout). */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-2 overflow-hidden rounded-2xl border">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A generic bordered section card (title bar + body lines), for detail
 * pages built from several stacked Cards. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full max-w-sm" />
        ))}
      </CardContent>
    </Card>
  );
}
