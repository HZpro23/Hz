import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { getPurchaseOrderById } from "@/features/purchases/queries";
import { PurchaseOrderActions } from "@/features/purchases/components/purchase-order-actions";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/features/purchases/schema";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getPurchaseOrderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`أمر الشراء ${order.orderNumber}`}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/purchases" />}
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
              <CardTitle>العناصر</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>تكلفة الوحدة</TableHead>
                    <TableHead>الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p
                            dir="ltr"
                            className="text-xs text-muted-foreground"
                          >
                            {item.product.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.quantity.toLocaleString("ar")}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(item.unitCost))}</TableCell>
                      <TableCell>
                        {formatCurrency(Number(item.unitCost) * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end text-sm font-medium">
                الإجمالي الكلي: {formatCurrency(Number(order.total))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>بيانات المورد</CardTitle>
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
        </div>
      </div>
    </div>
  );
}
