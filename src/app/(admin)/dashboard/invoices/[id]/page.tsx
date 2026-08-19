import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { BackButton } from "@/components/shared/back-button";
import {
  getInvoiceById,
  getCustomerOutstandingInvoices,
} from "@/features/invoices/queries";
import { getProductPickerOptions } from "@/features/products/queries";
import { getCustomerOptions } from "@/features/customers/queries";
import { getCategoryOptions } from "@/features/categories/queries";
import { getBrandOptions } from "@/features/brands/queries";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { RecordPaymentDialog } from "@/features/invoices/components/record-payment-dialog";
import { formatCurrency } from "@/lib/currency";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function InvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, productRows, customers, categories, brands] = await Promise.all([
    getInvoiceById(id),
    getProductPickerOptions(),
    getCustomerOptions(),
    getCategoryOptions(),
    getBrandOptions(),
  ]);

  if (!invoice) notFound();

  const outstandingInvoices = invoice.customerId
    ? await getCustomerOutstandingInvoices(invoice.customerId)
    : [];

  const products = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price1: Number(product.price1),
    price2: Number(product.price2),
    price3: Number(product.price3),
    categoryId: product.categoryId,
    brandId: product.brandId,
    quantity: product.quantity,
  }));

  const total = Number(invoice.total);
  const paidAmount = Number(invoice.paidAmount);
  const remaining = Math.max(0, total - paidAmount);
  const customerBalance =
    customers.find((customer) => customer.id === invoice.customerId)?.balance ??
    0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`الفاتورة ${invoice.invoiceNumber}`}
        action={
          <div className="flex gap-2">
            <BackButton fallbackHref="/dashboard/invoices" />
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/invoices/${invoice.id}/print?lang=${invoice.language.toLowerCase()}`}
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
          <RecordPaymentDialog
            invoiceId={invoice.id}
            remaining={remaining}
            customerBalance={customerBalance}
            hasCustomer={Boolean(invoice.customerId)}
            customerId={invoice.customerId}
            outstandingInvoices={outstandingInvoices.map((row) => ({
              ...row,
              total: Number(row.total),
              paidAmount: Number(row.paidAmount),
            }))}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
            items: invoice.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
          }}
          products={products}
          customers={customers}
          categories={categories}
          brands={brands}
          payments={invoice.payments.map((payment) => ({
            ...payment,
            amount: Number(payment.amount),
          }))}
          paymentTransactions={invoice.paymentTransactions.map(
            (transaction) => ({
              ...transaction,
              amount: Number(transaction.amount),
            }),
          )}
        />
      </div>
    </div>
  );
}
