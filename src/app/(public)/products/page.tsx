import { Package } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getPublicProductsPage } from "@/features/products/queries";
import { getPublicCategoriesWithCounts } from "@/features/categories/queries";
import { ProductCard } from "@/features/products/components/public/product-card";
import { ProductsFilterBar } from "@/features/products/components/public/products-filter-bar";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() || undefined;
  const categorySlug = params.category || undefined;

  const [{ items, total, pageSize }, categories] = await Promise.all([
    getPublicProductsPage({ query, categorySlug, page }),
    getPublicCategoriesWithCounts(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{ar.publicNav.products}</h1>
      <ProductsFilterBar categories={categories} />
      {items.length === 0 ? (
        <EmptyState icon={Package} title="لا توجد منتجات مطابقة لبحثك" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/products"
            searchParams={{ q: query, category: categorySlug }}
          />
        </>
      )}
    </div>
  );
}
