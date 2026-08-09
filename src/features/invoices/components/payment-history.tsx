"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/schema";
import { EditPaymentDialog } from "@/features/invoices/components/edit-payment-dialog";
import { PasswordConfirmDeleteDialog } from "@/components/shared/password-confirm-delete-dialog";
import { deletePayment } from "@/features/invoices/actions";
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
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(payment.createdAt)}
                  </p>
                  <EditPaymentDialog
                    paymentId={payment.id}
                    initialAmount={payment.amount}
                    initialMethod={payment.method}
                    initialNote={payment.note}
                  />
                  <PasswordConfirmDeleteDialog
                    action={(password) => deletePayment(payment.id, password)}
                    description={`سيتم حذف دفعة بقيمة ${formatCurrency(payment.amount)} نهائياً.`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
