import { PageHeader } from "@/components/shared/page-header";
import { BackButton } from "@/components/shared/back-button";
import { getSupplierOptions } from "@/features/suppliers/queries";
import { getProductPickerOptions } from "@/features/products/queries";
import { getCategoryOptions } from "@/features/categories/queries";
import { getBrandOptions } from "@/features/brands/queries";
import { PurchaseOrderForm } from "@/features/purchases/components/purchase-order-form";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const [suppliers, productRows, categories, brands] = await Promise.all([
    getSupplierOptions(),
    getProductPickerOptions(),
    getCategoryOptions(),
    getBrandOptions(),
  ]);
  const products = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price1: Number(product.price1),
    price2: Number(product.price2),
    price3: Number(product.price3),
    purchasePrice: Number(product.purchasePrice),
    categoryId: product.categoryId,
    brandId: product.brandId,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="أمر شراء جديد"
        action={<BackButton fallbackHref="/dashboard/purchases" />}
      />
      <PurchaseOrderForm
        suppliers={suppliers}
        products={products}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
