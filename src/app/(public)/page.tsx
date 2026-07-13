import Link from "next/link";
import { FolderTree, Sparkles, ShieldCheck, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getPublicProductsPage } from "@/features/products/queries";
import { getPublicCategoriesWithCounts } from "@/features/categories/queries";
import { ProductCard } from "@/features/products/components/public/product-card";
import { ar } from "@/i18n/ar";

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "منتجات موثوقة وأصلية" },
  { icon: Zap, label: "رد سريع على طلبات الأسعار" },
  { icon: Truck, label: "متابعة دقيقة للمخزون" },
];

export default async function HomePage() {
  const [{ items: latestProducts }, categories] = await Promise.all([
    getPublicProductsPage({ page: 1 }),
    getPublicCategoriesWithCounts(),
  ]);

  const featuredProducts = latestProducts.slice(0, 8);
  const featuredCategories = categories.slice(0, 6);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-border to-transparent"
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-4 py-24 text-center sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            كتالوج منتجات محدث باستمرار
          </div>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            {ar.siteName}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            تصفح كتالوج منتجاتنا واطلب عرض سعر مخصص، وسيتواصل معك فريقنا في
            أقرب وقت.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="cursor-pointer shadow-lg shadow-primary/25"
              nativeButton={false}
              render={<Link href="/products">{ar.publicNav.products}</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer"
              nativeButton={false}
              render={<Link href="/categories">{ar.publicNav.categories}</Link>}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t pt-8">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <item.icon className="size-4 text-primary" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {featuredCategories.length > 0 && (
        <section className="mx-auto max-w-6xl space-y-6 px-4 py-16">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              {ar.publicNav.categories}
            </h2>
            <Link
              href="/categories"
              className="text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              عرض الكل ←
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {featuredCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <FolderTree className="size-5" />
                </div>
                <span className="text-sm font-medium">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            أحدث المنتجات
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium text-primary hover:underline underline-offset-4"
          >
            عرض الكل ←
          </Link>
        </div>
        {featuredProducts.length === 0 ? (
          <EmptyState title="لا توجد منتجات بعد" />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
