"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/schema";
import { PasswordConfirmDeleteDialog } from "@/components/shared/password-confirm-delete-dialog";
import { deletePaymentTransaction } from "@/features/invoices/actions";

type PaymentTransactionRow = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  createdAt: Date;
};

/**
 * Shows the raw amount the admin actually recorded as paid in each
 * transaction on this invoice — separate from "سجل الدفعات" above, which
 * can show a smaller number here if the payment was split across several
 * invoices (e.g. 450 paid, but only 150 of it belongs to this invoice; the
 * other 300 shows up as payments on other invoices instead). Deleting one
 * reverses every invoice it touched — see deletePaymentTransaction.
 */
export function PaymentTransactionsCard({
  transactions,
}: {
  transactions: PaymentTransactionRow[];
}) {
  if (transactions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>المبلغ الفعلي المدفوع</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-3 text-sm">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium">
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[transaction.method] ??
                    transaction.method}
                </p>
                {transaction.note && (
                  <p className="text-xs text-muted-foreground">
                    {transaction.note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(transaction.createdAt)}
                </p>
                <PasswordConfirmDeleteDialog
                  action={(password) =>
                    deletePaymentTransaction(transaction.id, password)
                  }
                  description={`سيتم حذف هذه الدفعة (${formatCurrency(
                    transaction.amount,
                  )}) نهائياً وإلغاؤها من كل الفواتير التي شملتها، مع تحديث المبلغ المدفوع وحالة كل فاتورة متأثرة تبعاً لذلك.`}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
