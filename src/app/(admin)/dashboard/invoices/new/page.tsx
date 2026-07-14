import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getProductSelectOptions } from "@/features/products/queries";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const products = await getProductSelectOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="إنشاء فاتورة جديدة"
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/invoices" />}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
        }
      />
      <div className="max-w-3xl">
        <InvoiceForm products={products} />
      </div>
    </div>
  );
}
