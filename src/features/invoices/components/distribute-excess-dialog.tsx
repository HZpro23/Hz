"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { ar } from "@/i18n/ar";
import type { PaymentStatus } from "@/generated/prisma/client";

export type OutstandingInvoiceRow = {
  id: string;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
};

/**
 * Shown when a new invoice's payments exceed its own total and the selected
 * customer has other outstanding invoices — lets the admin use the excess
 * to pay those off instead of jumping straight to "add it to رصيد?". If
 * they pick invoices whose combined remaining is less than the excess,
 * whatever's still left over is applied to رصيد automatically (the admin
 * already opted into distributing it, so a second nested prompt would be
 * redundant); skipping falls back to the plain رصيد question.
 */
export function DistributeExcessDialog({
  open,
  excessAmount,
  invoices,
  onConfirm,
  onSkip,
}: {
  open: boolean;
  excessAmount: number;
  invoices: OutstandingInvoiceRow[];
  onConfirm: (invoiceIds: string[]) => void;
  onSkip: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(invoices.map((inv) => inv.id)),
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = invoices.length > 0 && selectedIds.size === invoices.length;
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(invoices.map((inv) => inv.id)));
  }

  const selectedRemaining = invoices
    .filter((inv) => selectedIds.has(inv.id))
    .reduce((sum, inv) => sum + Math.max(0, inv.total - inv.paidAmount), 0);

  function handleOpenChange(next: boolean) {
    if (!next) onSkip();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>توزيع المبلغ الزائد على فواتير أخرى</DialogTitle>
          <DialogDescription>
            الدفعة تتجاوز إجمالي هذه الفاتورة بمقدار {formatCurrency(excessAmount)}.
            يمكنك استخدام هذا المبلغ لتغطية فواتير أخرى غير مسددة لهذا العميل
            بدلاً من إضافته كرصيد مباشرة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {ar.invoices.selectInvoicesToPayTitle}
            </p>
            <button
              type="button"
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
              onClick={toggleAll}
            >
              {ar.invoices.selectAllInvoices}
            </button>
          </div>
          <div
            className={cn(
              "space-y-1.5 rounded-lg border p-2",
              invoices.length > 4 && "max-h-56 overflow-y-auto",
            )}
          >
            {invoices.map((invoice) => {
              const invoiceRemaining = Math.max(
                0,
                invoice.total - invoice.paidAmount,
              );
              return (
                <label
                  key={invoice.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.has(invoice.id)}
                    onCheckedChange={() => toggle(invoice.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium" dir="ltr">
                        {invoice.invoiceNumber}
                      </span>
                      <PaymentStatusBadge status={invoice.paymentStatus} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {formatDate(invoice.createdAt)}
                      </span>
                      <span>
                        {ar.invoices.invoiceTotalLabel}:{" "}
                        {formatCurrency(invoice.total)}
                      </span>
                      <span className="font-medium text-foreground">
                        {ar.invoices.remainingBalance}:{" "}
                        {formatCurrency(invoiceRemaining)}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {ar.invoices.selectedInvoicesRemaining}:{" "}
            {formatCurrency(selectedRemaining)}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 cursor-pointer"
            disabled={selectedIds.size === 0}
            onClick={() => onConfirm(Array.from(selectedIds))}
          >
            توزيع المبلغ على الفواتير المحددة
          </Button>
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onSkip}
          >
            تخطي
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
