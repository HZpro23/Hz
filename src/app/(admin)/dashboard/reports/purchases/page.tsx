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
import { getPurchasesReportPage } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/features/purchases/schema";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function PurchasesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const {
    items: purchases,
    total,
    pageSize,
  } = await getPurchasesReportPage({ page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير المشتريات"
        action={
          <BackButton
            fallbackHref="/dashboard/reports"
            className="print:hidden"
          />
        }
      />
      <ReportExportButtons type="purchases" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم أمر الشراء</TableHead>
            <TableHead>المورد</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead>تاريخ الإنشاء</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <span dir="ltr">{order.orderNumber}</span>
              </TableCell>
              <TableCell>{order.supplier.name}</TableCell>
              <TableCell>
                <Badge
                  variant={order.status === "RECEIVED" ? "default" : "secondary"}
                >
                  {PURCHASE_ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </TableCell>
              <TableCell>{formatCurrency(Number(order.total))}</TableCell>
              <TableCell>
                {new Date(order.createdAt).toLocaleDateString("fr-FR")}
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
          basePath="/dashboard/reports/purchases"
          searchParams={{}}
        />
      </div>
    </div>
  );
}
