import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataTablePagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
  pageParam = "page",
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  /** Query key to write the page number under — override when a page hosts
   * more than one independently-paginated table. */
  pageParam?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function hrefForPage(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set(pageParam, String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {total.toLocaleString("ar")} نتيجة — صفحة {page.toLocaleString("ar")}{" "}
        من {pageCount.toLocaleString("ar")}
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false} render={<Link href={hrefForPage(page - 1)} />}
          >
            <ChevronRight className="size-4" />
            السابق
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronRight className="size-4" />
            السابق
          </Button>
        )}
        {hasNext ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false} render={<Link href={hrefForPage(page + 1)} />}
          >
            التالي
            <ChevronLeft className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            التالي
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
