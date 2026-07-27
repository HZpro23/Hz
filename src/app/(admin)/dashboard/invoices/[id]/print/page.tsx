import { notFound } from "next/navigation";
import {
  getInvoiceById,
  getOtherOutstandingInvoices,
} from "@/features/invoices/queries";
import { InvoicePrintButton } from "@/features/invoices/components/invoice-print-button";
import { InvoicePdfButton } from "@/features/invoices/components/invoice-pdf-button";
import { ar as arDict } from "@/i18n/ar";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

type Lang = "ar" | "fr";

const LABELS: Record<
  Lang,
  {
    title: string;
    invoiceNumber: string;
    date: string;
    billTo: string;
    phone: string;
    product: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    total: string;
    previousDebts: string;
    grandTotal: string;
    itemsCount: string;
    totalWeight: string;
    thankYou: string;
    print: string;
    openPdf: string;
  }
> = {
  ar: {
    title: "فاتورة",
    invoiceNumber: "رقم الفاتورة",
    date: "التاريخ",
    billTo: "فاتورة إلى",
    phone: "الهاتف",
    product: "نوع البضاعة",
    quantity: "العدد",
    unitPrice: "التمن",
    lineTotal: "الإجمالي",
    total: "إجمالي المنتجات",
    previousDebts: "الحساب القديم",
    grandTotal: "الإجمالي الكلي",
    itemsCount: "عدد المنتجات",
    totalWeight: "الوزن الإجمالي (kg)",
    thankYou: "شكراً لتعاملكم معنا",
    print: "طباعة / حفظ كـ PDF",
    openPdf: "فتح كملف PDF",
  },
  fr: {
    title: "Facture",
    invoiceNumber: "Numéro de facture",
    date: "Date",
    billTo: "Facturé à",
    phone: "Téléphone",
    product: "Produit",
    quantity: "Quantité",
    unitPrice: "Prix unitaire",
    lineTotal: "Sous-total",
    total: "Total des produits",
    previousDebts: "Ancien compte",
    grandTotal: "Total général",
    itemsCount: "Nombre de produits",
    totalWeight: "Poids total (kg)",
    thankYou: "Merci pour votre confiance",
    print: "Imprimer / Enregistrer en PDF",
    openPdf: "Ouvrir en PDF",
  },
};

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang: langParam } = await searchParams;

  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const lang: Lang =
    (langParam ?? invoice.language.toLowerCase()) === "fr" ? "fr" : "ar";
  const t = LABELS[lang];
  const dir = lang === "fr" ? "ltr" : "rtl";

  const itemsTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
  const itemsCount = invoice.items.length;
  const totalWeight = invoice.items.reduce(
    (sum, item) => sum + Number(item.product?.weight ?? 0) * item.quantity,
    0,
  );

  const otherOutstandingInvoices = invoice.customerId
    ? await getOtherOutstandingInvoices(invoice.customerId, invoice.id)
    : [];
  const previousDebtsTotal = otherOutstandingInvoices.reduce(
    (sum, other) =>
      sum + Math.max(0, Number(other.total) - Number(other.paidAmount)),
    0,
  );
  const grandTotal = itemsTotal + previousDebtsTotal;

  return (
    <div
      dir={dir}
      className="mx-auto max-w-2xl space-y-6 p-6 print:max-w-none print:p-0"
    >
      <style>{"@page { size: A5; margin: 5mm; }"}</style>
      <div className="flex justify-end gap-2 print:hidden">
        <InvoicePdfButton
          targetId="invoice-card"
          fileName={`${invoice.invoiceNumber}.pdf`}
          label={t.openPdf}
        />
        <InvoicePrintButton label={t.print} />
      </div>

      <div
        id="invoice-card"
        className="rounded-xl border bg-card p-8 print:rounded-none print:border-none print:p-0"
      >
        <table className="w-full table-fixed border-collapse text-sm print:text-xs">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[72%]" />
            <col className="w-[20%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead>
            <tr>
              <th
                colSpan={4}
                className="border-none p-0 pb-6 text-start font-normal print:pb-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold print:text-lg">
                      {arDict.siteName}
                    </h1>
                  </div>
                  <div className="text-end">
                    <h2 className="text-xl font-bold print:text-base">
                      {t.title}
                    </h2>
                    <p className="text-sm font-semibold text-foreground print:text-xs">
                      {t.invoiceNumber}:{" "}
                      <span dir="ltr">{invoice.invoiceNumber}</span>
                    </p>
                    <p className="text-sm font-semibold text-foreground print:text-xs">
                      {t.date}:{" "}
                      {new Date(invoice.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 print:mt-4">
                  <p className="text-sm font-semibold text-foreground print:text-xs">
                    {t.billTo}:
                    <span className="font-bold mx-1.5">
                      {invoice.customerName}
                    </span>
                  </p>

                  <p className="text-sm font-semibold text-foreground print:text-xs">
                    {t.phone}: <span dir="ltr">{invoice.customerPhone}</span>
                  </p>
                </div>
              </th>
            </tr>
            <tr className="border-b text-start">
              <th className="px-3 py-2 text-start font-bold border-2 border-gray-400">
                <span className="block truncate">{t.quantity}</span>
              </th>
              <th className="px-3 py-2 text-start font-bold border-2 border-gray-400">
                <span className="block truncate">{t.product}</span>
              </th>
              <th className="px-2 py-2 text-start font-bold border-2 border-gray-400">
                <span className="block leading-tight whitespace-normal break-words">
                  {t.unitPrice} {`(${CURRENCY_LABEL["fr"]})`}
                </span>
              </th>
              <th className="px-2 py-2 text-start font-bold border-2 border-gray-400">
                <span className="block leading-tight whitespace-normal break-words">
                  {t.lineTotal} {`(${CURRENCY_LABEL["fr"]})`}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr
                key={item.id}
                className="border-b font-semibold text-foreground"
              >
                <td className="px-3 py-2 border-2 border-gray-400">
                  <span className="block truncate">{item.quantity}</span>
                </td>
                <td className="px-3 py-2 border-2 border-gray-400">
                  <span className="block truncate">{item.name}</span>
                </td>
                <td className="px-3 py-2 border-2 border-gray-400">
                  <span className="block truncate">
                    {formatCurrency(Number(item.unitPrice), lang, true)}
                  </span>
                </td>
                <td className="px-3 py-2 border-2 border-gray-400">
                  <span className="block truncate">
                    {formatCurrency(
                      Number(item.unitPrice) * item.quantity,
                      lang,
                      true,
                    )}
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="border-none p-0 pt-5 print:pt-3">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t-2 border-gray-400 pt-3 text-sm font-semibold text-foreground print:pt-2 print:text-xs">
                  <p>
                    {t.itemsCount}: <span className="font-bold">{itemsCount}</span>
                  </p>
                  <p>
                    {t.totalWeight}:{" "}
                    <span className="font-bold" dir="ltr">
                      {totalWeight.toFixed(2)} kg
                    </span>
                  </p>
                </div>

                <div className="mt-2 flex flex-col gap-1 text-sm font-semibold text-foreground print:text-xs">
                  <p>
                    {t.total}: {formatCurrency(itemsTotal, lang, false)}
                  </p>
                  <p>
                    {t.previousDebts}:{" "}
                    {formatCurrency(previousDebtsTotal, lang, false)}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-md border-2 border-gray-400 bg-gray-100 px-4 py-2 print:mt-2 print:py-1.5 print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
                  <p className="text-base font-bold print:text-sm">
                    {t.grandTotal}
                  </p>
                  <p className="text-lg font-bold print:text-base">
                    {formatCurrency(grandTotal, lang, false)}
                  </p>
                </div>

                {invoice.notes && (
                  <p className="mt-4 text-sm font-semibold text-foreground print:text-xs">
                    {invoice.notes}
                  </p>
                )}

                <p className="mt-4 text-center text-sm font-semibold text-foreground print:text-xs">
                  {t.thankYou}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
