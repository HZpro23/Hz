import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getCustomersReportPage } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function CustomersReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const {
    items: customers,
    total,
    pageSize,
  } = await getCustomersReportPage({ page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير العملاء"
        action={
          <Button
            variant="outline"
            className="print:hidden"
            nativeButton={false} render={<Link href="/dashboard/reports" />}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
        }
      />
      <ReportExportButtons type="customers" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead>عدد الطلبات</TableHead>
            <TableHead>إجمالي المشتريات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>
                <span dir="ltr">{customer.phone}</span>
              </TableCell>
              <TableCell>
                <span dir="ltr">{customer.email ?? "—"}</span>
              </TableCell>
              <TableCell>{customer.ordersCount.toLocaleString("ar")}</TableCell>
              <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="print:hidden">
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/dashboard/reports/customers"
          searchParams={{}}
        />
      </div>
    </div>
  );
}
