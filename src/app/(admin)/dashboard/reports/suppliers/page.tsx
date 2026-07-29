import { BackButton } from "@/components/shared/back-button";
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
import { getSuppliersReportPage } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function SuppliersReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const {
    items: suppliers,
    total,
    pageSize,
  } = await getSuppliersReportPage({ page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير الموردون"
        action={
          <BackButton
            fallbackHref="/dashboard/reports"
            className="print:hidden"
          />
        }
      />
      <ReportExportButtons type="suppliers" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead>عدد أوامر الشراء</TableHead>
            <TableHead>إجمالي المشتريات منه</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">{supplier.name}</TableCell>
              <TableCell>
                <span dir="ltr">{supplier.phone ?? "—"}</span>
              </TableCell>
              <TableCell>
                <span dir="ltr">{supplier.email ?? "—"}</span>
              </TableCell>
              <TableCell>{supplier.ordersCount.toLocaleString("ar")}</TableCell>
              <TableCell>{formatCurrency(supplier.totalPurchased)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="print:hidden">
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/dashboard/reports/suppliers"
          searchParams={{}}
        />
      </div>
    </div>
  );
}
