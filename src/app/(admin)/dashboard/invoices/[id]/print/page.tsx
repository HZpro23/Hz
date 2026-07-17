import { notFound } from "next/navigation";
import { getInvoiceById } from "@/features/invoices/queries";
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
    product: "المنتج",
    quantity: "الكمية",
    unitPrice: "السعر",
    lineTotal: "الإجمالي الفرعي",
    total: "الإجمالي الكلي",
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
    unitPrice: "Prix",
    lineTotal: "Sous-total",
    total: "Total",
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

  const grandTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  return (
    <div
      dir={dir}
      className="mx-auto max-w-2xl space-y-6 p-6 print:max-w-none print:p-0"
    >
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
        className="space-y-8 rounded-xl border bg-card p-8 print:rounded-none print:border-none print:p-0"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{arDict.siteName}</h1>
          </div>
          <div className="text-end">
            <h2 className="text-xl font-semibold">{t.title}</h2>
            <p className="text-sm text-muted-foreground">
              {t.invoiceNumber}: <span dir="ltr">{invoice.invoiceNumber}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t.date}:{" "}
              {new Date(invoice.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t.billTo}:
            <span className="font-medium mx-1.5">{invoice.customerName}</span>
          </p>

          <p className="text-sm text-muted-foreground">
            {t.phone}: <span dir="ltr">{invoice.customerPhone}</span>
          </p>
        </div>

        <table className="w-full border-collapse text-sm border border-gray-200">
          <thead>
            <tr className="border-b text-start">
              <th className="px-3 py-2 text-start font-medium border border-gray-200">
                <span className="block truncate max-w-[10ch]">{t.product}</span>
              </th>
              <th className="px-3 py-2 text-start font-medium border border-gray-200">
                <span className="block truncate max-w-[10ch]">
                  {t.quantity}
                </span>
              </th>
              <th className="px-2 py-2 text-start font-medium border border-gray-200">
                <span className="block truncate max-w-[10ch]">
                  {t.unitPrice} {`(${CURRENCY_LABEL["fr"]})`}
                </span>
              </th>
              <th className="px-2 py-2 text-start font-medium border border-gray-200">
                <span className="block truncate max-w-[18ch]">
                  {t.lineTotal} {`(${CURRENCY_LABEL["fr"]})`}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[18ch]">
                    {item.name}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[15ch]">
                    {item.quantity}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[15ch]">
                    {formatCurrency(Number(item.unitPrice), lang, true)}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[15ch]">
                    {formatCurrency(
                      Number(item.unitPrice) * item.quantity,
                      lang,
                      true,
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-start border-t pt-4">
          <p className="text-lg font-semibold">
            {t.total}: {formatCurrency(grandTotal, lang, false)}
          </p>
        </div>

        {invoice.notes && (
          <p className="text-sm text-muted-foreground">{invoice.notes}</p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t.thankYou}
        </p>
      </div>
    </div>
  );
}
