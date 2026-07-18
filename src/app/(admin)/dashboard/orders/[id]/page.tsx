import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Phone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getOrderById } from "@/features/orders/queries";
import { getCustomerOptions } from "@/features/customers/queries";
import { getProductPickerOptions } from "@/features/products/queries";
import { OrderStatusSelect } from "@/features/orders/components/order-status-select";
import { OrderItemsPriceForm } from "@/features/orders/components/order-items-price-form";
import { GenerateInvoiceDialog } from "@/features/orders/components/generate-invoice-dialog";
import { OrderCustomerCard } from "@/features/orders/components/order-customer-card";
import { InvoiceLockedNotice } from "@/features/orders/components/invoice-locked-notice";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function buildDefaultMessage(order: {
  customerName: string;
  orderNumber: string;
  items: { product: { name: string }; quantity: number }[];
  total: unknown;
}) {
  const lines = [
    `مرحباً ${order.customerName}،`,
    `بخصوص طلبكم رقم ${order.orderNumber}:`,
    ...order.items.map((item) => `- ${item.product.name} × ${item.quantity}`),
    `الإجمالي: ${order.total}`,
    "يسعدنا خدمتكم، شكراً لتواصلكم معنا.",
  ];
  return lines.join("\n");
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, customers, productRows] = await Promise.all([
    getOrderById(id),
    getCustomerOptions(),
    getProductPickerOptions(),
  ]);
  if (!order) notFound();

  const products = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price1: Number(product.price1),
    price2: Number(product.price2),
    price3: Number(product.price3),
  }));

  const message = buildDefaultMessage(order);
  const whatsappUrl = buildWhatsAppUrl(order.customerPhone, message);
  const locked = Boolean(order.invoice);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`الطلب ${order.orderNumber}`}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/orders" />}
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
              <CardTitle>عناصر الطلب</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsPriceForm
                orderId={order.id}
                items={order.items.map((item) => ({
                  id: item.id,
                  productId: item.productId,
                  productName: item.product.name,
                  quantity: item.quantity,
                  price: Number(item.price),
                  product: {
                    ...item.product,
                    price1: Number(item.product.price1),
                    price2: Number(item.product.price2),
                    price3: Number(item.product.price3),
                  },
                }))}
                products={products}
                locked={locked}
                invoiceId={order.invoice?.id}
                invoiceNumber={order.invoice?.invoiceNumber}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {order.invoice ? (
                <InvoiceLockedNotice
                  invoiceId={order.invoice.id}
                  invoiceNumber={order.invoice.invoiceNumber}
                  message="تم إصدار فاتورة لهذا الطلب بالفعل. لتسجيل دفعات أو تعديل الفاتورة، يرجى الانتقال إلى صفحتها مباشرة."
                />
              ) : (
                <GenerateInvoiceDialog
                  orderId={order.id}
                  orderTotal={Number(order.total)}
                  customerBalance={
                    order.customer ? Number(order.customer.balance) : 0
                  }
                  hasCustomer={Boolean(order.customer)}
                />
              )}
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" />
                }
              >
                <MessageCircle className="size-4" />
                إرسال عبر واتساب
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={`tel:${order.customerPhone}`} />}
              >
                <Phone className="size-4" />
                الاتصال بالعميل
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <OrderCustomerCard
            orderId={order.id}
            customers={customers}
            currentCustomer={
              order.customer
                ? {
                    id: order.customer.id,
                    name: order.customer.name,
                    phone: order.customer.phone,
                    email: order.customer.email,
                    address: order.customer.address,
                    notes: order.customer.notes,
                  }
                : null
            }
            snapshot={{
              name: order.customerName,
              phone: order.customerPhone,
              email: order.customerEmail,
            }}
            createdAt={order.createdAt}
            notes={order.notes}
            locked={locked}
            invoiceId={order.invoice?.id}
            invoiceNumber={order.invoice?.invoiceNumber}
          />

          <Card>
            <CardHeader>
              <CardTitle>الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusSelect orderId={order.id} status={order.status} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
