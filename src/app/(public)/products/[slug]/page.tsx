import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductBySlug } from "@/features/products/queries";
import { ProductGallery } from "@/features/products/components/public/product-gallery";
import { RequestQuoteDialog } from "@/features/quote-requests/components/request-quote-dialog";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "ACTIVE") notFound();

  const outOfStock = product.quantity <= 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />
        <div className="space-y-6">
          <div className="space-y-2">
            <Badge variant="secondary">{product.category.name}</Badge>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            {product.brand && (
              <p className="text-sm text-muted-foreground">
                العلامة التجارية: {product.brand.name}
              </p>
            )}
          </div>

          {product.description && (
            <div className="space-y-1">
              <h2 className="font-medium">الوصف</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="font-medium">المواصفات</h2>
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">SKU</dt>
              <dd dir="ltr" className="text-start">
                {product.sku}
              </dd>
              {product.barcode && (
                <>
                  <dt className="text-muted-foreground">الباركود</dt>
                  <dd dir="ltr" className="text-start">
                    {product.barcode}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">القسم</dt>
              <dd>{product.category.name}</dd>
            </dl>
          </div>

          {outOfStock ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                نفدت الكمية، هذا المنتج غير متوفر حالياً
              </p>
              <Button size="lg" className="w-full sm:w-auto" disabled>
                طلب عرض سعر
              </Button>
            </div>
          ) : (
            <RequestQuoteDialog
              productId={product.id}
              productName={product.name}
              trigger={
                <Button size="lg" className="w-full sm:w-auto cursor-pointer">
                  طلب عرض سعر
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
