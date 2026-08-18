import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCustomerProfile } from "@/features/customers/queries";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { ar } from "@/i18n/ar";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

const CASABLANCA_TZ = "Africa/Casablanca";

function toDateKey(date: Date) {
  return new Date(date).toLocaleDateString("en-CA", {
    timeZone: CASABLANCA_TZ,
  });
}

function isValidDateString(value?: string) {
  return Boolean(value) && !Number.isNaN(new Date(value!).getTime());
}

export default async function CustomerStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;

  const profile = await getCustomerProfile(id);
  if (!profile) notFound();
  const { customer, invoices } = profile;

  const backHref = `/dashboard/customers/${id}`;
  const hasValidRange =
    isValidDateString(from) && isValidDateString(to) && from! <= to!;

  if (!hasValidRange) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-lg font-semibold">
          الرجاء اختيار فترة زمنية صحيحة لعرض كشف الحساب
        </p>
        <p className="text-sm text-muted-foreground">
          ارجع إلى صفحة العميل واختر تاريخ بداية وتاريخ نهاية صحيحين (بحيث يكون
          تاريخ البداية قبل تاريخ النهاية أو يساويه)، ثم اضغط على زر تصدير كشف
          الحساب.
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={backHref} />}
          className="cursor-pointer"
        >
          <ArrowRight className="size-4" />
          الرجوع إلى صفحة العميل
        </Button>
      </div>
    );
  }

  const filteredInvoices = invoices
    .filter((invoice) => {
      const key = toDateKey(invoice.createdAt);
      return key >= from! && key <= to!;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const totalInvoices = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );
  const totalPayments = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.paidAmount),
    0,
  );
  const totalDebt = totalInvoices - totalPayments;
  const isEmpty = filteredInvoices.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 print:max-w-none print:p-0">
      <style>
        {`
          @page { size: A4; margin: 12mm; }
          @media print {
            #statement-card, #statement-card * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

      <div className="flex justify-end gap-2 print:hidden">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={backHref} />}
          className="cursor-pointer"
        >
          <ArrowRight className="size-4" />
          الرجوع
        </Button>
        <InvoicePrintButton label="طباعة / حفظ كـ PDF" />
      </div>

      <div
        id="statement-card"
        className="space-y-6 rounded-xl border bg-card p-8 print:rounded-none print:border-none print:p-0"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold print:text-lg">{ar.siteName}</h1>
            <p className="mt-1 text-sm text-muted-foreground print:text-xs">
              كشف حساب عميل
            </p>
          </div>
          <div className="text-end text-sm font-semibold print:text-xs">
            <p>العميل: {customer.name}</p>
            <p dir="ltr">{customer.phone}</p>
            <p className="mt-1 text-muted-foreground">
              الفترة: {formatDate(new Date(`${from}T00:00:00`))} —{" "}
              {formatDate(new Date(`${to}T00:00:00`))}
            </p>
          </div>
        </div>

        {isEmpty ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            لا توجد فواتير لهذا العميل خلال الفترة المحددة
          </p>
        ) : (
          <table className="w-full border-collapse text-sm print:text-xs">
            <thead>
              <tr className="border-b-2">
                <th className="border-e py-2 pe-4 text-start font-bold">
                  الفواتير
                </th>
                <th className="py-2 ps-4 text-start font-bold">الدفعات</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const total = Number(invoice.total);
                const paid = Number(invoice.paidAmount);
                return (
                  <tr key={invoice.id} className="border-b">
                    <td className="border-e py-1.5 pe-4">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          <span dir="ltr">{invoice.invoiceNumber}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDate(invoice.createdAt)}
                          </span>
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 ps-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {formatCurrency(paid)}
                        </span>
                        <PaymentStatusBadge status={invoice.paymentStatus} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">إجمالي الفواتير</p>
            <p className="mt-1 font-bold">{formatCurrency(totalInvoices)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">إجمالي الدفعات</p>
            <p className="mt-1 font-bold">{formatCurrency(totalPayments)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">إجمالي الدين</p>
            <p className="mt-1 font-bold">{formatCurrency(totalDebt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
