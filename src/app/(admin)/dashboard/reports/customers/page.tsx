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
import { getCustomersReportData } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function CustomersReportPage() {
  const customers = await getCustomersReportData();

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
    </div>
  );
}
