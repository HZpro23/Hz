import { notFound } from "next/navigation";
import { getPurchaseOrderById } from "@/features/purchases/queries";
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
    orderNumber: string;
    date: string;
    supplier: string;
    phone: string;
    product: string;
    quantity: string;
    unitCost: string;
    lineTotal: string;
    total: string;
    print: string;
    openPdf: string;
    supplierSignature: string;
  }
> = {
  ar: {
    title: "فاتورة شراء",
    orderNumber: "رقم أمر الشراء",
    date: "التاريخ",
    supplier: "المورد",
    phone: "الهاتف",
    product: "المنتج",
    quantity: "الكمية",
    unitCost: "تكلفة الوحدة",
    lineTotal: "الإجمالي الفرعي",
    total: "الإجمالي الكلي",
    print: "طباعة / حفظ كـ PDF",
    openPdf: "فتح كملف PDF",
    supplierSignature: "توقيع المورد",
  },
  fr: {
    title: "Facture d'achat",
    orderNumber: "Numéro de commande",
    date: "Date",
    supplier: "Fournisseur",
    phone: "Téléphone",
    product: "Produit",
    quantity: "Quantité",
    unitCost: "Prix unitaire",
    lineTotal: "Sous-total",
    total: "Total",
    print: "Imprimer / Enregistrer en PDF",
    openPdf: "Ouvrir en PDF",
    supplierSignature: "Signature du fournisseur",
  },
};

export default async function PurchaseOrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang: langParam } = await searchParams;

  const order = await getPurchaseOrderById(id);
  if (!order) notFound();

  const lang: Lang =
    (langParam ?? order.language.toLowerCase()) === "fr" ? "fr" : "ar";
  const t = LABELS[lang];
  const dir = lang === "fr" ? "ltr" : "rtl";

  const grandTotal = order.items.reduce(
    (sum, item) => sum + Number(item.unitCost) * item.quantity,
    0,
  );

  return (
    <div
      dir={dir}
      className="mx-auto max-w-2xl space-y-6 p-6 print:max-w-none print:p-0"
    >
      <div className="flex justify-end gap-2 print:hidden">
        <InvoicePdfButton
          targetId="purchase-order-card"
          fileName={`${order.orderNumber}.pdf`}
          label={t.openPdf}
        />
        <InvoicePrintButton label={t.print} />
      </div>

      <div
        id="purchase-order-card"
        className="space-y-8 rounded-xl border bg-card p-8 print:rounded-none print:border-none print:p-0"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{arDict.siteName}</h1>
          </div>
          <div className="text-end">
            <h2 className="text-xl font-semibold">{t.title}</h2>
            <p className="text-sm text-muted-foreground">
              {t.orderNumber}: <span dir="ltr">{order.orderNumber}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t.date}: {new Date(order.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t.supplier}:
            <span className="font-medium mx-1.5">{order.supplier.name}</span>
          </p>
          {order.supplier.phone && (
            <p className="text-sm text-muted-foreground">
              {t.phone}: <span dir="ltr">{order.supplier.phone}</span>
            </p>
          )}
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
                <span className="block truncate max-w-[15ch]">
                  {t.unitCost} {`(${CURRENCY_LABEL["fr"]})`}
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
            {order.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[18ch]">
                    {item.product.name}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[15ch]">
                    {item.quantity}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[15ch]">
                    {formatCurrency(Number(item.unitCost), lang, true)}
                  </span>
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  <span className="block truncate max-w-[15ch]">
                    {formatCurrency(
                      Number(item.unitCost) * item.quantity,
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

        <div className="flex justify-start pt-8 print:break-inside-avoid">
          <div className="flex flex-col items-center gap-2">
            <div className="size-32 rounded-md border border-gray-300" />
            <p className="text-sm text-muted-foreground">
              {t.supplierSignature}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
