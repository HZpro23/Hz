import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Phone, MessageCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getQuoteRequestById } from "@/features/quote-requests/queries";
import { QuoteResponseForm } from "@/features/quote-requests/components/quote-response-form";
import { QuoteStatusSelect } from "@/features/quote-requests/components/quote-status-select";
import { ConvertToOrderButton } from "@/features/quote-requests/components/convert-to-order-button";
import { InvoiceLanguageDialog } from "@/features/quote-requests/components/invoice-language-dialog";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function buildDefaultMessage(quote: {
  customerName: string;
  quantity: number;
  price: unknown;
  product: { name: string } | null;
}) {
  const lines = [`مرحباً ${quote.customerName}،`];
  if (quote.product) lines.push(`بخصوص طلبكم على منتج "${quote.product.name}"`);
  lines.push(`الكمية: ${quote.quantity}`);
  if (quote.price !== null) lines.push(`السعر: ${quote.price}`);
  lines.push("يسعدنا خدمتكم، شكراً لتواصلكم معنا.");
  return lines.join("\n");
}

export default async function QuoteRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuoteRequestById(id);
  if (!quote) notFound();

  const message = quote.message || buildDefaultMessage(quote);
  const whatsappUrl = buildWhatsAppUrl(quote.phone, message);
  const productImage = quote.product?.images[0];
  const outOfStock = !!quote.product && quote.product.quantity <= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تفاصيل طلب عرض السعر"
        action={
          <Button
            variant="outline"
            nativeButton={false} render={<Link href="/dashboard/quote-requests" />}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>بيانات العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">الاسم: </span>
                {quote.customerName}
              </p>
              <p>
                <span className="text-muted-foreground">الهاتف: </span>
                <span dir="ltr">{quote.phone}</span>
              </p>
              {quote.email && (
                <p>
                  <span className="text-muted-foreground">البريد الإلكتروني: </span>
                  <span dir="ltr">{quote.email}</span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">الكمية: </span>
                {quote.quantity.toLocaleString("ar")}
              </p>
              {quote.notes && (
                <p>
                  <span className="text-muted-foreground">ملاحظات: </span>
                  {quote.notes}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">تاريخ الطلب: </span>
                {new Date(quote.createdAt).toLocaleDateString("ar-EG")}
              </p>
            </CardContent>
          </Card>

          {quote.product && (
            <Card>
              <CardHeader>
                <CardTitle>المنتج المطلوب</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {productImage ? (
                    <Image
                      src={productImage.secureUrl}
                      alt={quote.product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package className="size-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="font-medium">{quote.product.name}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>عرض السعر</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteResponseForm
                quoteId={quote.id}
                initialPrice={quote.price ? Number(quote.price) : null}
                initialMessage={quote.message}
                disabled={outOfStock}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {quote.product && quote.price !== null && (
                <InvoiceLanguageDialog quoteId={quote.id} />
              )}
              <Button
                nativeButton={false}
                render={
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" />
                }
              >
                <MessageCircle className="size-4" />
                إرسال عبر واتساب
              </Button>
              <Button variant="outline" nativeButton={false} render={<a href={`tel:${quote.phone}`} />}>
                <Phone className="size-4" />
                الاتصال بالعميل
              </Button>
              {quote.order ? (
                <Button
                  variant="secondary"
                  nativeButton={false} render={<Link href={`/dashboard/orders/${quote.order.id}`} />}
                >
                  عرض الطلب المرتبط
                </Button>
              ) : quote.status === "ACCEPTED" ? (
                <ConvertToOrderButton quoteId={quote.id} disabled={outOfStock} />
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteStatusSelect quoteId={quote.id} status={quote.status} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
