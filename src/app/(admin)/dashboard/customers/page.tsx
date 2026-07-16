import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import {
  getCustomersPage,
  getCustomerById,
} from "@/features/customers/queries";
import { CustomersTable } from "@/features/customers/components/customers-table";
import { CustomersFilterBar } from "@/features/customers/components/customers-filter-bar";
import { CustomerFormSheet } from "@/features/customers/components/customer-form-sheet";
import { DEBT_STATUS_VALUE_BY_LABEL } from "@/features/customers/schema";
import { ar } from "@/i18n/ar";
import type { DebtFilter } from "@/features/customers/queries";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    new?: string;
    edit?: string;
    debtFilter?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() || undefined;
  const debtFilter = params.debtFilter
    ? ((DEBT_STATUS_VALUE_BY_LABEL[params.debtFilter] ??
        params.debtFilter) as DebtFilter)
    : undefined;

  const [{ items, total, pageSize }, editingCustomer] = await Promise.all([
    getCustomersPage({ query, debtFilter, page }),
    params.edit ? getCustomerById(params.edit) : Promise.resolve(null),
  ]);

  const isSheetOpen = params.new === "1" || Boolean(params.edit);

  function buildHref(extra: Record<string, string>) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (page > 1) sp.set("page", String(page));
    if (params.debtFilter) sp.set("debtFilter", params.debtFilter);
    for (const [key, value] of Object.entries(extra)) sp.set(key, value);
    return `/dashboard/customers?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.customers}
        action={
          <Button nativeButton={false} render={<Link href={buildHref({ new: "1" })} />}>
            <Plus className="size-4" />
            إضافة عميل
          </Button>
        }
      />
      <div className="space-y-3">
        <DataTableSearch placeholder="ابحث بالاسم أو الهاتف أو البريد..." />
        <CustomersFilterBar />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد عملاء"
          description="سيظهر هنا العملاء المضافون يدوياً أو الناتجون عن الطلبات"
        />
      ) : (
        <>
          <CustomersTable data={items} />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/customers"
            searchParams={{ q: query, debtFilter: params.debtFilter }}
          />
        </>
      )}
      <CustomerFormSheet
        key={editingCustomer?.id ?? (params.new ? "new" : "closed")}
        open={isSheetOpen}
        customer={editingCustomer}
      />
    </div>
  );
}
