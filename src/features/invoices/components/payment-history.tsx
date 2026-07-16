import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/schema";
import { ar } from "@/i18n/ar";

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  createdAt: Date;
  invoiceNumber?: string;
};

export function PaymentHistory({ payments }: { payments: PaymentRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ar.customers.paymentsHistory}</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {ar.invoices.noPayments}
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                    {payment.invoiceNumber ? ` · ${payment.invoiceNumber}` : ""}
                  </p>
                  {payment.note && (
                    <p className="text-xs text-muted-foreground">
                      {payment.note}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(payment.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
