import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { getInvoicesPage } from "@/features/invoices/queries";
import { InvoicesTable } from "@/features/invoices/components/invoices-table";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() || undefined;

  const { items, total, pageSize } = await getInvoicesPage({ query, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفواتير"
        description="إنشاء وتعديل فواتير العملاء"
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/invoices/new" />}>
            <Plus className="size-4" />
            إنشاء فاتورة
          </Button>
        }
      />
      <DataTableSearch placeholder="ابحث برقم الفاتورة أو اسم العميل أو الهاتف..." />
      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="لا توجد فواتير"
          description="ابدأ بإنشاء أول فاتورة لأحد العملاء"
        />
      ) : (
        <>
          <InvoicesTable
            data={items.map((item) => ({
              ...item,
              total: Number(item.total),
            }))}
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/invoices"
            searchParams={{ q: query }}
          />
        </>
      )}
    </div>
  );
}
