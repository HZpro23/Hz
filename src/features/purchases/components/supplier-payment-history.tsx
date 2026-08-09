"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/schema";
import { PasswordConfirmDeleteDialog } from "@/components/shared/password-confirm-delete-dialog";
import { deleteSupplierPayment } from "@/features/purchases/actions";

type SupplierPaymentRow = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  createdAt: Date;
  orderNumber?: string;
};

export function SupplierPaymentHistory({
  payments,
}: {
  payments: SupplierPaymentRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الدفعات</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لم يتم تسجيل أي دفعات بعد
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
                    {payment.orderNumber ? ` · ${payment.orderNumber}` : ""}
                  </p>
                  {payment.note && (
                    <p className="text-xs text-muted-foreground">
                      {payment.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(payment.createdAt)}
                  </p>
                  <PasswordConfirmDeleteDialog
                    action={(password) =>
                      deleteSupplierPayment(payment.id, password)
                    }
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
