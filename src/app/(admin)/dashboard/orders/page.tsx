import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { getOrdersPage } from "@/features/orders/queries";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { OrdersFilterBar } from "@/features/orders/components/orders-filter-bar";
import { ORDER_STATUS_VALUE_BY_LABEL } from "@/features/orders/schema";
import { ar } from "@/i18n/ar";
import type { OrderStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() || undefined;
  // Filter's Select writes the Arabic label to the URL; translate it back
  // to the Prisma enum. Falls back to the raw value for old English links.
  const status = params.status
    ? ((ORDER_STATUS_VALUE_BY_LABEL[params.status] ??
        params.status) as OrderStatus)
    : undefined;
  const from = params.from || undefined;
  const to = params.to || undefined;

  const { items, total, pageSize } = await getOrdersPage({
    query,
    status,
    from,
    to,
    page,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.orders}
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/orders/new" />}>
            <Plus className="size-4" />
            إنشاء طلب
          </Button>
        }
      />
      <div className="space-y-3">
        <DataTableSearch placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..." />
        <OrdersFilterBar />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد طلبات"
          description="تظهر هنا الطلبات الناتجة عن سلة العملاء في الموقع"
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
            searchParams={{ q: query, status: params.status, from, to }}
          />
        </>
      )}
    </div>
  );
}
