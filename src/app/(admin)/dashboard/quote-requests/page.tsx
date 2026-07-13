import { MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { getQuoteRequestsPage } from "@/features/quote-requests/queries";
import { QuoteRequestsTable } from "@/features/quote-requests/components/quote-requests-table";
import { ar } from "@/i18n/ar";
import type { QuoteStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function QuoteRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() || undefined;
  const status = params.status as QuoteStatus | undefined;

  const { items, total, pageSize } = await getQuoteRequestsPage({
    query,
    status,
    page,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={ar.admin.quoteRequests} />
      <DataTableSearch placeholder="ابحث بالاسم أو رقم الهاتف..." />
      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="لا توجد طلبات عرض سعر"
          description="ستظهر هنا طلبات عرض الأسعار المرسلة من الموقع"
        />
      ) : (
        <>
          <QuoteRequestsTable data={items} />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/quote-requests"
            searchParams={{ q: query }}
          />
        </>
      )}
    </div>
  );
}
