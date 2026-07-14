import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getInvoiceById } from "@/features/invoices/queries";
import { getProductSelectOptions } from "@/features/products/queries";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";

export const dynamic = "force-dynamic";

export default async function InvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, products] = await Promise.all([
    getInvoiceById(id),
    getProductSelectOptions(),
  ]);

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`الفاتورة ${invoice.invoiceNumber}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/dashboard/invoices" />}
            >
              <ArrowRight className="size-4" />
              رجوع
            </Button>
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/invoices/${invoice.id}/print?lang=${invoice.language.toLowerCase()}`}
                  target="_blank"
                />
              }
            >
              <Printer className="size-4" />
              عرض / طباعة
            </Button>
          </div>
        }
      />
      <div className="max-w-3xl">
        <InvoiceForm
          invoice={{
            id: invoice.id,
            language: invoice.language,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone,
            customerEmail: invoice.customerEmail,
            notes: invoice.notes,
            quoteRequestId: invoice.quoteRequestId,
            items: invoice.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
          }}
          products={products}
        />
      </div>
    </div>
  );
}
