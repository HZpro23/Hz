import { PageHeader } from "@/components/shared/page-header";
import { BackButton } from "@/components/shared/back-button";
import { getProductPickerOptions } from "@/features/products/queries";
import { getCustomerOptions } from "@/features/customers/queries";
import { getCategoryOptions } from "@/features/categories/queries";
import { getBrandOptions } from "@/features/brands/queries";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [productRows, customers, categories, brands] = await Promise.all([
    getProductPickerOptions(),
    getCustomerOptions(),
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
    categoryId: product.categoryId,
    brandId: product.brandId,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="إنشاء فاتورة جديدة"
        action={<BackButton fallbackHref="/dashboard/invoices" />}
      />
      <InvoiceForm
        products={products}
        customers={customers}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
