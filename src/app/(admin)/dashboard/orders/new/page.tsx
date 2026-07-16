import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getProductPickerOptions } from "@/features/products/queries";
import { getCustomerOptions } from "@/features/customers/queries";
import { OrderForm } from "@/features/orders/components/order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [productRows, customers] = await Promise.all([
    getProductPickerOptions(),
    getCustomerOptions(),
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
        title="إنشاء طلب جديد"
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/orders" />}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
        }
      />
      <OrderForm products={products} customers={customers} />
    </div>
  );
}
