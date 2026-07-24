import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getSupplierOptions } from "@/features/suppliers/queries";
import { getProductPickerOptions } from "@/features/products/queries";
import { PurchaseOrderForm } from "@/features/purchases/components/purchase-order-form";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const [suppliers, productRows] = await Promise.all([
    getSupplierOptions(),
    getProductPickerOptions(),
  ]);
  const products = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price1: Number(product.price1),
    price2: Number(product.price2),
    price3: Number(product.price3),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="أمر شراء جديد"
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/purchases" />}>
            <ArrowRight className="size-4" />
            رجوع
          </Button>
        }
      />
      <div className="max-w-2xl">
        <PurchaseOrderForm suppliers={suppliers} products={products} />
      </div>
    </div>
  );
}
