import { BackButton } from "@/components/shared/back-button";
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
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getOrdersReportPage } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { ORDER_STATUS_LABELS } from "@/features/orders/schema";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function OrdersReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { items: orders, total, pageSize } = await getOrdersReportPage({ page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير الطلبات"
        action={
          <BackButton
            fallbackHref="/dashboard/reports"
            className="print:hidden"
          />
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
              <TableCell>{order.customerName}</TableCell>
              <TableCell>
                <span dir="ltr">{order.customerPhone}</span>
              </TableCell>
              <TableCell>{formatCurrency(Number(order.total))}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(order.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="print:hidden">
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/dashboard/reports/orders"
          searchParams={{}}
        />
      </div>
    </div>
  );
}
