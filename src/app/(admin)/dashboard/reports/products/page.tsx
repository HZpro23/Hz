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
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getProductsReportPage } from "@/features/reports/queries";
import { ReportExportButtons } from "@/features/reports/components/report-export-buttons";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function ProductsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const {
    items: products,
    total,
    pageSize,
  } = await getProductsReportPage({ page });

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير المنتجات"
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
      <ReportExportButtons type="products" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المنتج</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>القسم</TableHead>
            <TableHead>العلامة التجارية</TableHead>
            <TableHead>السعر الأول</TableHead>
            <TableHead>السعر الثاني</TableHead>
            <TableHead>السعر الثالث</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>الحالة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">
                <span dir="ltr">{product.sku}</span>
              </TableCell>
              <TableCell>{product.category.name}</TableCell>
              <TableCell>{product.brand?.name ?? "—"}</TableCell>
              <TableCell>{formatCurrency(Number(product.price1))}</TableCell>
              <TableCell>{formatCurrency(Number(product.price2))}</TableCell>
              <TableCell>{formatCurrency(Number(product.price3))}</TableCell>
              <TableCell>{product.quantity.toLocaleString("ar")}</TableCell>
              <TableCell>
                <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                  {product.status === "ACTIVE" ? "نشط" : "غير نشط"}
                </Badge>
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
          basePath="/dashboard/reports/products"
          searchParams={{}}
        />
      </div>
    </div>
  );
}
