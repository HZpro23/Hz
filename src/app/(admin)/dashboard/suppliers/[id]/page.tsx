import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Wallet,
  ClipboardList,
  Receipt,
  CircleDollarSign,
  FileClock,
  FileX2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { BackButton } from "@/components/shared/back-button";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getSupplierProfile } from "@/features/suppliers/queries";
import { PurchaseOrdersTable } from "@/features/purchases/components/purchase-orders-table";
import { SupplierPaymentHistory } from "@/features/purchases/components/supplier-payment-history";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function SupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getSupplierProfile(id);
  if (!profile) notFound();

  const { supplier, purchaseOrders, payments, totals } = profile;

  const partiallyPaidOrders = purchaseOrders.filter(
    (order) => order.paymentStatus === "PARTIALLY_PAID",
  );
  const unpaidOrders = purchaseOrders.filter(
    (order) => order.paymentStatus === "UNPAID",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description="ملف المورد"
        action={<BackButton fallbackHref="/dashboard/suppliers" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="إجمالي المشتريات"
          value={totals.totalPurchased}
          icon={ClipboardList}
          formatValue={(value) => formatCurrency(value)}
        />
        <StatCard
          title="إجمالي المدفوع"
          value={totals.totalPaid}
          icon={Wallet}
          formatValue={(value) => formatCurrency(value)}
        />
        <StatCard
          title="إجمالي المبلغ المتبقي"
          value={totals.totalOutstanding}
          icon={Receipt}
          variant="warning"
          formatValue={(value) => formatCurrency(value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أوامر الشراء غير المسددة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="أوامر مدفوعة جزئياً"
              value={partiallyPaidOrders.length}
              icon={FileClock}
              variant="warning"
            />
            <StatCard
              title="أوامر غير مدفوعة"
              value={unpaidOrders.length}
              icon={FileX2}
              variant="warning"
            />
            <StatCard
              title="إجمالي المبلغ المتبقي"
              value={totals.totalOutstanding}
              icon={CircleDollarSign}
              variant="warning"
              formatValue={(value) => formatCurrency(value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>بيانات المورد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">الاسم: </span>
            {supplier.name}
          </p>
          {supplier.phone && (
            <p>
              <span className="text-muted-foreground">الهاتف: </span>
              <span dir="ltr">{supplier.phone}</span>
            </p>
          )}
          {supplier.email && (
            <p>
              <span className="text-muted-foreground">البريد الإلكتروني: </span>
              <span dir="ltr">{supplier.email}</span>
            </p>
          )}
          {supplier.address && (
            <p>
              <span className="text-muted-foreground">العنوان: </span>
              {supplier.address}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">تاريخ التسجيل: </span>
            {formatDate(supplier.createdAt)}
          </p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/dashboard/suppliers?edit=${supplier.id}`} />}
          >
            تعديل بيانات المورد
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل أوامر الشراء</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="لا توجد أوامر شراء لهذا المورد"
            />
          ) : (
            <PurchaseOrdersTable
              data={purchaseOrders.map((order) => ({
                id: order.id,
                orderNumber: order.orderNumber,
                total: Number(order.total),
                status: order.status,
                paymentStatus: order.paymentStatus,
                createdAt: order.createdAt,
                supplier: { name: supplier.name },
              }))}
            />
          )}
        </CardContent>
      </Card>

      <SupplierPaymentHistory
        payments={payments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
        }))}
      />
    </div>
  );
}
