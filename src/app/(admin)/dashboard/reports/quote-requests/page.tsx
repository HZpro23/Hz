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
import { getQuoteRequestsReportData } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { QUOTE_STATUS_LABELS } from "@/features/quote-requests/schema";

export const dynamic = "force-dynamic";

export default async function QuoteRequestsReportPage() {
  const quotes = await getQuoteRequestsReportData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير طلبات عرض السعر"
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
      <ReportExportButtons type="quote-requests" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم العميل</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>المنتج</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>التاريخ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="font-medium">
                {quote.customerName}
              </TableCell>
              <TableCell>
                <span dir="ltr">{quote.phone}</span>
              </TableCell>
              <TableCell>{quote.product?.name ?? "غير محدد"}</TableCell>
              <TableCell>{quote.quantity.toLocaleString("ar")}</TableCell>
              <TableCell>{quote.price ? String(quote.price) : "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {QUOTE_STATUS_LABELS[quote.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
