import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { getOrdersPage } from "@/features/orders/queries";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { ar } from "@/i18n/ar";
import type { OrderStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() || undefined;
  const status = params.status as OrderStatus | undefined;

  const { items, total, pageSize } = await getOrdersPage({
    query,
    status,
    page,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={ar.admin.orders} />
      <DataTableSearch placeholder="ابحث برقم الطلب أو اسم العميل..." />
      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد طلبات"
          description="تظهر هنا الطلبات الناتجة عن قبول عروض الأسعار"
        />
      ) : (
        <>
          <OrdersTable
            data={items.map((item) => ({ ...item, total: Number(item.total) }))}
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/orders"
            searchParams={{ q: query }}
          />
        </>
      )}
    </div>
  );
}
