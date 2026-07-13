import Link from "next/link";
import { Plus, FolderTree } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import {
  getCategoriesPage,
  getCategoryOptions,
  getCategoryById,
} from "@/features/categories/queries";
import { CategoriesTable } from "@/features/categories/components/categories-table";
import { CategoryFormSheet } from "@/features/categories/components/category-form-sheet";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
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

  const [{ items, total, pageSize }, categoryOptions, editingCategory] =
    await Promise.all([
      getCategoriesPage({ query, page }),
      getCategoryOptions(),
      params.edit ? getCategoryById(params.edit) : Promise.resolve(null),
    ]);

  const isSheetOpen = params.new === "1" || Boolean(params.edit);

  function buildHref(extra: Record<string, string>) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (page > 1) sp.set("page", String(page));
    for (const [key, value] of Object.entries(extra)) sp.set(key, value);
    return `/dashboard/categories?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.categories}
        action={
          <Button nativeButton={false} render={<Link href={buildHref({ new: "1" })} />}>
            <Plus className="size-4" />
            إضافة قسم
          </Button>
        }
      />
      <DataTableSearch placeholder="ابحث عن قسم..." />
      {items.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="لا توجد أقسام"
          description="ابدأ بإضافة أول قسم لمنتجاتك"
        />
      ) : (
        <>
          <CategoriesTable data={items} />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/dashboard/categories"
            searchParams={{ q: query }}
          />
        </>
      )}
      <CategoryFormSheet
        key={editingCategory?.id ?? (params.new ? "new" : "closed")}
        open={isSheetOpen}
        category={editingCategory}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
