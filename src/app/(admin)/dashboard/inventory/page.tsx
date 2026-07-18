import { AlertTriangle, Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { getInventoryMovementsPage } from "@/features/inventory/queries";
import {
  getLowStockProductsPage,
  getProductSelectOptions,
} from "@/features/products/queries";
import { RecordMovementDialog } from "@/features/inventory/components/record-movement-dialog";
import { MOVEMENT_TYPE_LABELS } from "@/features/inventory/schema";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; lowStockPage?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const lowStockPage = Math.max(1, Number(params.lowStockPage) || 1);

  const [
    { items: lowStockProducts, total: lowStockTotal, pageSize: lowStockPageSize },
    productOptions,
    { items, total, pageSize },
  ] = await Promise.all([
    getLowStockProductsPage({ page: lowStockPage }),
    getProductSelectOptions(),
    getInventoryMovementsPage({ page }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar.admin.inventory}
        action={<RecordMovementDialog products={productOptions} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            منتجات منخفضة المخزون
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد منتجات منخفضة المخزون حالياً
            </p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow dir="rtl">
                    <TableHead>المنتج</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>الكمية الحالية</TableHead>
                    <TableHead>الحد الأدنى</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.id} dir="rtl">
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span dir="rtl">{product.sku}</span>
                      </TableCell>
                      <TableCell className="font-medium text-destructive">
                        {product.quantity.toLocaleString("ar")}
                      </TableCell>
                      <TableCell>
                        {product.minStockLevel.toLocaleString("ar")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination
                page={lowStockPage}
                pageSize={lowStockPageSize}
                total={lowStockTotal}
                basePath="/dashboard/inventory"
                pageParam="lowStockPage"
                searchParams={{ page: params.page }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل حركة المخزون</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="لا توجد حركات مخزون بعد"
              description="ستظهر هنا عمليات الإدخال والإخراج والتسوية"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow dir="rtl">
                    <TableHead>المنتج</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((movement) => (
                    <TableRow key={movement.id} dir="rtl">
                      <TableCell>
                        <div>
                          <p className="font-medium">{movement.product.name}</p>
                          <p
                            dir="rtl"
                            className="text-xs text-muted-foreground"
                          >
                            {movement.product.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {MOVEMENT_TYPE_LABELS[movement.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {movement.quantity.toLocaleString("ar")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.reason ?? "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(movement.createdAt).toLocaleDateString(
                          "fr-FR",
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                basePath="/dashboard/inventory"
                searchParams={{ lowStockPage: params.lowStockPage }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
