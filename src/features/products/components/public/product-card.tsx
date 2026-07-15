import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";

export function ProductCard({
  product,
}: {
  product: {
    id: string;
    name: string;
    slug: string;
    quantity: number;
    category: { name: string };
    images: { secureUrl: string }[];
  };
}) {
  const image = product.images[0];
  const outOfStock = product.quantity <= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {image ? (
          <Image
            src={image.secureUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-10 text-muted-foreground" />
          </div>
        )}
        <span className="absolute top-2 inset-s-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
          {product.category.name}
        </span>
        {outOfStock && (
          <span className="absolute top-2 inset-e-2 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-medium text-destructive-foreground shadow-sm">
            نفدت الكمية
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 px-4 pt-3">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-1 font-medium transition-colors group-hover:text-primary"
        >
          {product.name}
        </Link>
      </div>
      <div className="p-4 pt-3">
        {outOfStock ? (
          <Button size="sm" className="w-full" disabled>
            نفدت الكمية
          </Button>
        ) : (
          <AddToCartButton
            size="sm"
            productId={product.id}
            productName={product.name}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
