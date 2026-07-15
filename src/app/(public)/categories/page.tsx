import Link from "next/link";
import Image from "next/image";
import { FolderTree } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getPublicCategoriesWithCounts } from "@/features/categories/queries";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getPublicCategoriesWithCounts();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{ar.publicNav.categories}</h1>
      {categories.length === 0 ? (
        <EmptyState icon={FolderTree} title="لا توجد أقسام حالياً" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-colors hover:bg-muted/50"
            >
              <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted">
                {category.imageSecureUrl ? (
                  <Image
                    src={category.imageSecureUrl}
                    alt={category.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <FolderTree className="size-8 text-muted-foreground" />
                )}
              </div>
              <span className="font-medium">{category.name}</span>
              <span className="text-xs text-muted-foreground">
                {category._count.products.toLocaleString("ar")} منتج
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
