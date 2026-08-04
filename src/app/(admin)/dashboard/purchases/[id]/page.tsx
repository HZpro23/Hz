import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { BackButton } from "@/components/shared/back-button";
import { getPurchaseOrderById } from "@/features/purchases/queries";
import { getProductPickerOptions } from "@/features/products/queries";
import { PurchaseOrderActions } from "@/features/purchases/components/purchase-order-actions";
import { PurchaseOrderItemsForm } from "@/features/purchases/components/purchase-order-items-form";
import { RecordSupplierPaymentDialog } from "@/features/purchases/components/record-supplier-payment-dialog";
import { SupplierPaymentHistory } from "@/features/purchases/components/supplier-payment-history";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/features/purchases/schema";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, productRows] = await Promise.all([
    getPurchaseOrderById(id),
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

  const orderTotal = Number(order.total);
  const paidAmount = Number(order.paidAmount);
  const remaining = Math.max(0, orderTotal - paidAmount);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`أمر الشراء ${order.orderNumber}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/purchases/${order.id}/print?lang=ar`}
                />
              }
            >
              <Printer className="size-4" />
              فاتورة بالعربية
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/purchases/${order.id}/print?lang=fr`}
                />
              }
            >
              <Printer className="size-4" />
              Facture en Français
            </Button>
            <BackButton fallbackHref="/dashboard/purchases" />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>العناصر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.status === "RECEIVED" && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-400">
                  تم استلام هذا الأمر بالفعل وأُضيفت كمياته إلى المخزون. تعديل
                  العناصر هنا يُحدّث سجل أمر الشراء فقط، ولا يُعدّل كميات
                  المخزون التي أُضيفت مسبقاً.
                </p>
              )}
              <PurchaseOrderItemsForm
                purchaseOrderId={order.id}
                items={order.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitCost: Number(item.unitCost),
                }))}
                products={products}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>بيانات المورد</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto cursor-pointer gap-1 px-2 py-1 text-xs"
                nativeButton={false}
                render={
                  <Link href={`/dashboard/suppliers/${order.supplierId}`} />
                }
              >
                <UserCircle className="size-3.5" />
                الذهاب إلى صفحة المورد
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">الاسم: </span>
                {order.supplier.name}
              </p>
              {order.supplier.phone && (
                <p>
                  <span className="text-muted-foreground">الهاتف: </span>
                  <span dir="ltr">{order.supplier.phone}</span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">التاريخ: </span>
                {new Date(order.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الحالة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge>{PURCHASE_ORDER_STATUS_LABELS[order.status]}</Badge>
              {order.status === "PENDING" && (
                <PurchaseOrderActions purchaseOrderId={order.id} />
              )}
              {order.receivedAt && (
                <p className="text-xs text-muted-foreground">
                  تم الاستلام في{" "}
                  {new Date(order.receivedAt).toLocaleDateString("fr-FR")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>حالة الدفع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">المبلغ المدفوع: </span>
                <span className="font-medium">{formatCurrency(paidAmount)}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">المبلغ المتبقي: </span>
                <span className="font-medium">{formatCurrency(remaining)}</span>
              </p>
              {remaining > 0 && (
                <RecordSupplierPaymentDialog
                  purchaseOrderId={order.id}
                  remaining={remaining}
                />
              )}
            </CardContent>
          </Card>

          <SupplierPaymentHistory
            payments={order.payments.map((payment) => ({
              ...payment,
              amount: Number(payment.amount),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
