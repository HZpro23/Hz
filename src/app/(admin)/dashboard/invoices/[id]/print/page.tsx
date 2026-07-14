import { notFound } from "next/navigation";
import { getInvoiceById } from "@/features/invoices/queries";
import { InvoicePrintButton } from "@/features/quote-requests/components/invoice-print-button";
import { InvoicePdfButton } from "@/features/quote-requests/components/invoice-pdf-button";
import { ar as arDict } from "@/i18n/ar";

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

  const lang: Lang = (langParam ?? invoice.language.toLowerCase()) === "fr" ? "fr" : "ar";
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
              {t.invoiceNumber}:{" "}
              <span dir="ltr">{invoice.invoiceNumber}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t.date}:{" "}
              {new Date(invoice.createdAt).toLocaleDateString(
                lang === "fr" ? "fr-FR" : "ar-EG",
              )}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t.billTo}
          </p>
          <p className="font-medium">{invoice.customerName}</p>
          <p className="text-sm text-muted-foreground">
            {t.phone}: <span dir="ltr">{invoice.customerPhone}</span>
          </p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-start">
              <th className="py-2 text-start font-medium">{t.product}</th>
              <th className="py-2 text-start font-medium">{t.quantity}</th>
              <th className="py-2 text-start font-medium">{t.unitPrice}</th>
              <th className="py-2 text-start font-medium">{t.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{Number(item.unitPrice).toFixed(2)}</td>
                <td className="py-2">
                  {(Number(item.unitPrice) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t pt-4">
          <p className="text-lg font-semibold">
            {t.total}: {grandTotal.toFixed(2)}
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
