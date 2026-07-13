import { notFound } from "next/navigation";
import { getQuoteRequestById } from "@/features/quote-requests/queries";
import { InvoicePrintButton } from "@/features/quote-requests/components/invoice-print-button";
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
    total: string;
    thankYou: string;
    print: string;
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
    total: "الإجمالي الكلي",
    thankYou: "شكراً لتعاملكم معنا",
    print: "طباعة / حفظ كـ PDF",
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
    total: "Total",
    thankYou: "Merci pour votre confiance",
    print: "Imprimer / Enregistrer en PDF",
  },
};

export default async function QuoteInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang: langParam } = await searchParams;
  const lang: Lang = langParam === "fr" ? "fr" : "ar";
  const t = LABELS[lang];
  const dir = lang === "fr" ? "ltr" : "rtl";

  const quote = await getQuoteRequestById(id);
  if (!quote) notFound();

  const invoiceNumber = `INV-${quote.id.slice(-8).toUpperCase()}`;
  const unitPrice = quote.price ? Number(quote.price) : 0;
  const lineTotal = unitPrice * quote.quantity;

  return (
    <div dir={dir} className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex justify-end print:hidden">
        <InvoicePrintButton label={t.print} />
      </div>

      <div className="space-y-8 rounded-xl border bg-card p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{arDict.siteName}</h1>
          </div>
          <div className="text-end">
            <h2 className="text-xl font-semibold">{t.title}</h2>
            <p className="text-sm text-muted-foreground">
              {t.invoiceNumber}: <span dir="ltr">{invoiceNumber}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t.date}:{" "}
              {new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "ar-EG")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t.billTo}
          </p>
          <p className="font-medium">{quote.customerName}</p>
          <p className="text-sm text-muted-foreground">
            {t.phone}: <span dir="ltr">{quote.phone}</span>
          </p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-start">
              <th className="py-2 text-start font-medium">{t.product}</th>
              <th className="py-2 text-start font-medium">{t.quantity}</th>
              <th className="py-2 text-start font-medium">{t.unitPrice}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">{quote.product?.name ?? "—"}</td>
              <td className="py-2">{quote.quantity}</td>
              <td className="py-2">{unitPrice.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end border-t pt-4">
          <p className="text-lg font-semibold">
            {t.total}: {lineTotal.toFixed(2)}
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t.thankYou}
        </p>
      </div>
    </div>
  );
}
