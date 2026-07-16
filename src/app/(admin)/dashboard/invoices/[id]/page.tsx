import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getInvoiceById } from "@/features/invoices/queries";
import { getProductPickerOptions } from "@/features/products/queries";
import { getCustomerOptions } from "@/features/customers/queries";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { RecordPaymentDialog } from "@/features/invoices/components/record-payment-dialog";
import { PaymentHistory } from "@/features/invoices/components/payment-history";
import { formatCurrency } from "@/lib/currency";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function InvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, productRows, customers] = await Promise.all([
    getInvoiceById(id),
    getProductPickerOptions(),
    getCustomerOptions(),
  ]);

  if (!invoice) notFound();

  const products = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price1: Number(product.price1),
    price2: Number(product.price2),
    price3: Number(product.price3),
  }));

  const total = Number(invoice.total);
  const paidAmount = Number(invoice.paidAmount);
  const remaining = Math.max(0, total - paidAmount);

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

      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <PaymentStatusBadge status={invoice.paymentStatus} />
        <p className="text-sm">
          <span className="text-muted-foreground">
            {ar.invoices.remainingBalance}:{" "}
          </span>
          <span className="font-medium">{formatCurrency(remaining)}</span>
        </p>
        {remaining > 0 && (
          <RecordPaymentDialog invoiceId={invoice.id} remaining={remaining} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="max-w-3xl lg:col-span-2">
          <InvoiceForm
            invoice={{
              id: invoice.id,
              language: invoice.language,
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              customerPhone: invoice.customerPhone,
              customerEmail: invoice.customerEmail,
              notes: invoice.notes,
              orderId: invoice.orderId,
              paymentMethod: invoice.paymentMethod,
              paymentStatus: invoice.paymentStatus,
              paidAmount,
              items: invoice.items.map((item) => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
              })),
            }}
            products={products}
            customers={customers}
          />
        </div>
        <div>
          <PaymentHistory
            payments={invoice.payments.map((payment) => ({
              ...payment,
              amount: Number(payment.amount),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
