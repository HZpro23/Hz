import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getPurchaseOrdersPage } from "@/features/purchases/queries";
import { PurchaseOrdersTable } from "@/features/purchases/components/purchase-orders-table";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { items, total, pageSize } = await getPurchaseOrdersPage({ page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.purchases}
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/purchases/new" />}>
            <Plus className="size-4" />
            أمر شراء جديد
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد أوامر شراء"
          description="ابدأ بإنشاء أول أمر شراء من أحد الموردين"
        />
      ) : (
        <>
          <PurchaseOrdersTable
            data={items.map((item) => ({ ...item, total: Number(item.total) }))}
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/purchases"
            searchParams={{}}
          />
        </>
      )}
    </div>
  );
}
