import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { getOrderById } from "@/features/orders/queries";
import { OrderStatusSelect } from "@/features/orders/components/order-status-select";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
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
                      <TableCell>{String(item.price)}</TableCell>
                      <TableCell>
                        {(Number(item.price) * item.quantity).toLocaleString(
                          "ar",
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end text-sm font-medium">
                الإجمالي الكلي: {String(order.total)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>بيانات العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">الاسم: </span>
                {order.customer.name}
              </p>
              <p>
                <span className="text-muted-foreground">الهاتف: </span>
                <span dir="ltr">{order.customer.phone}</span>
              </p>
              <p>
                <span className="text-muted-foreground">تاريخ الطلب: </span>
                {new Date(order.createdAt).toLocaleDateString("en-US")}
              </p>
            </CardContent>
          </Card>

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
