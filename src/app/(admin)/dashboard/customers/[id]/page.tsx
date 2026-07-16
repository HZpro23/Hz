import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Wallet, ShoppingCart, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCustomerProfile } from "@/features/customers/queries";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { InvoicesTable } from "@/features/invoices/components/invoices-table";
import { PaymentHistory } from "@/features/invoices/components/payment-history";
import { formatCurrency } from "@/lib/currency";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCustomerProfile(id);
  if (!profile) notFound();

  const { customer, orders, invoices, payments, totals } = profile;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={ar.customers.profile}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/customers" />}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={ar.customers.totalPurchased}
          value={totals.totalPurchased}
          icon={ShoppingCart}
          formatValue={(value) => formatCurrency(value)}
        />
        <StatCard
          title={ar.customers.totalPaid}
          value={totals.totalPaid}
          icon={Wallet}
          formatValue={(value) => formatCurrency(value)}
        />
        <StatCard
          title={ar.customers.totalDebt}
          value={totals.totalDebt}
          icon={Receipt}
          variant="warning"
          formatValue={(value) => formatCurrency(value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ar.customers.personalInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">الاسم: </span>
            {customer.name}
          </p>
          <p>
            <span className="text-muted-foreground">الهاتف: </span>
            <span dir="ltr">{customer.phone}</span>
          </p>
          {customer.email && (
            <p>
              <span className="text-muted-foreground">البريد الإلكتروني: </span>
              <span dir="ltr">{customer.email}</span>
            </p>
          )}
          {customer.address && (
            <p>
              <span className="text-muted-foreground">العنوان: </span>
              {customer.address}
            </p>
          )}
          {customer.notes && (
            <p>
              <span className="text-muted-foreground">ملاحظات: </span>
              {customer.notes}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">تاريخ التسجيل: </span>
            {new Date(customer.createdAt).toLocaleDateString("fr-FR")}
          </p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/dashboard/customers?edit=${customer.id}`} />
            }
          >
            {ar.customers.editCustomerInfo}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ar.customers.ordersHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={ar.customers.noOrders}            />
          ) : (
            <OrdersTable
              searchable
              data={orders.map((order) => ({
                id: order.id,
                orderNumber: order.orderNumber,
                total: Number(order.total),
                status: order.status,
                createdAt: order.createdAt,
                customerName: order.customerName,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ar.customers.invoicesHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={ar.customers.noInvoices}            />
          ) : (
            <InvoicesTable
              searchable
              data={invoices.map((invoice) => ({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                language: invoice.language,
                customerName: invoice.customerName,
                customerPhone: invoice.customerPhone,
                total: Number(invoice.total),
                paymentStatus: invoice.paymentStatus,
                createdAt: invoice.createdAt,
                _count: { items: invoice.items.length },
              }))}
            />
          )}
        </CardContent>
      </Card>

      <PaymentHistory
        payments={payments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
        }))}
      />
    </div>
  );
}
