import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تأكيد الطلب",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">تم استقبال طلبك</h1>
        <p className="text-muted-foreground">شكراً لتعاملك معنا</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="font-semibold mb-2">بيانات الطلب</h2>
            <dl className="space-y-1 text-sm">
              <div>
                <dt className="text-muted-foreground">رقم الطلب</dt>
                <dd className="font-medium" dir="ltr">
                  {order.id}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">التاريخ</dt>
                <dd>{new Date(order.createdAt).toLocaleDateString("fr-FR")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">الحالة</dt>
                <dd>
                  {order.status === "PENDING" ? "قيد الانتظار" : order.status}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="font-semibold mb-2">بيانات الاتصال</h2>
            <dl className="space-y-1 text-sm">
              <div>
                <dt className="text-muted-foreground">الاسم</dt>
                <dd>{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">الهاتف</dt>
                <dd dir="ltr">{order.customerPhone}</dd>
              </div>
              {order.customerEmail && (
                <div>
                  <dt className="text-muted-foreground">البريد الإلكتروني</dt>
                  <dd dir="ltr">{order.customerEmail}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">المنتجات</h2>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الكمية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product.name}
                    </TableCell>
                    <TableCell>{item.quantity.toLocaleString("ar")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {order.notes && (
          <div>
            <h2 className="font-semibold mb-2">ملاحظات</h2>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="text-foreground">
            سيتم التواصل معك قريباً لتأكيد الطلب والاتفاق على السعر والتسليم.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/products" className="flex-1">
            <Button className="w-full cursor-pointer">العودة للمتجر</Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full cursor-pointer">
              الصفحة الرئيسية
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
