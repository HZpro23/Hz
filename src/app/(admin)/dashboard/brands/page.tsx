import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import {
  getBrandsPage,
  getBrandById,
} from "@/features/brands/queries";
import { BrandsTable } from "@/features/brands/components/brands-table";
import { BrandFormSheet } from "@/features/brands/components/brand-form-sheet";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    new?: string;
    edit?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() || undefined;

  const [{ items, total, pageSize }, editingBrand] = await Promise.all([
    getBrandsPage({ query, page }),
    params.edit ? getBrandById(params.edit) : Promise.resolve(null),
  ]);

  const isSheetOpen = params.new === "1" || Boolean(params.edit);

  function buildHref(extra: Record<string, string>) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (page > 1) sp.set("page", String(page));
    for (const [key, value] of Object.entries(extra)) sp.set(key, value);
    return `/dashboard/brands?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.brands}
        action={
          <Button nativeButton={false} render={<Link href={buildHref({ new: "1" })} />}>
            <Plus className="size-4" />
            إضافة علامة تجارية
          </Button>
        }
      />
      <DataTableSearch placeholder="ابحث عن علامة تجارية..." />
      {items.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="لا توجد علامات تجارية"
          description="ابدأ بإضافة أول علامة تجارية لمنتجاتك"
        />
      ) : (
        <>
          <BrandsTable data={items} />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/brands"
            searchParams={{ q: query }}
          />
        </>
      )}
      <BrandFormSheet
        key={editingBrand?.id ?? (params.new ? "new" : "closed")}
        open={isSheetOpen}
        brand={editingBrand}
      />
    </div>
  );
}
