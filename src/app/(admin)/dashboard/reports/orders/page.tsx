import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { getOrdersReportData } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { ORDER_STATUS_LABELS } from "@/features/orders/schema";

export const dynamic = "force-dynamic";

export default async function OrdersReportPage() {
  const orders = await getOrdersReportData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير الطلبات"
        action={
          <Button
            variant="outline"
            className="print:hidden"
            nativeButton={false}
            render={<Link href="/dashboard/reports" />}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
        }
      />
      <ReportExportButtons type="orders" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الطلب</TableHead>
            <TableHead>العميل</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>التاريخ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <span dir="ltr">{order.orderNumber}</span>
              </TableCell>
              <TableCell>{order.customer.name}</TableCell>
              <TableCell>
                <span dir="ltr">{order.customer.phone}</span>
              </TableCell>
              <TableCell>{String(order.total)}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(order.createdAt).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
