"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { formatCurrency } from "@/lib/currency";
import { ar } from "@/i18n/ar";
import { deleteInvoice } from "@/features/invoices/actions";
import type { PaymentStatus } from "@/generated/prisma/client";

export type InvoiceDeleteInfo = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  /** The invoice's stored, signed lifetime effect on its customer's رصيد:
   * negative when من الرصيد was drawn on for it, positive when it left the
   * customer overpaid (credit). Deleting the invoice can undo that effect,
   * but only if the admin explicitly opts in via the checkbox below. */
  balanceEffectApplied: number;
};

type InvoiceDeleteSummary = Pick<
  InvoiceDeleteInfo,
  | "invoiceNumber"
  | "customerName"
  | "customerPhone"
  | "total"
  | "paymentStatus"
  | "createdAt"
>;

/** The invoice summary shown before deleting it — reused by both the plain
 * "are you sure" step and the رصيد question that can follow it, so the
 * admin sees the same details regardless of which step they're on. */
function InvoiceSummaryDetails({ invoice }: { invoice: InvoiceDeleteSummary }) {
  return (
    <>
      <p>
        {ar.invoices.deleteInvoiceNumber}:{" "}
        <span dir="ltr">{invoice.invoiceNumber}</span>
      </p>
      <p>
        {ar.invoices.deleteCustomerName}: {invoice.customerName}{" "}
        <span dir="ltr">({invoice.customerPhone})</span>
      </p>
      <p>
        {ar.invoices.deleteInvoiceTotal}: {formatCurrency(invoice.total)}
      </p>
      <p className="flex items-center gap-1.5">
        {ar.invoices.paymentStatus}:{" "}
        <PaymentStatusBadge status={invoice.paymentStatus} />
      </p>
      <p>{new Date(invoice.createdAt).toLocaleDateString("fr-FR")}</p>
    </>
  );
}

/** Shared content for the "deleting this invoice would change رصيد"
 * confirmation — reused by the single-row dialog below and the bulk-delete
 * queue, which asks the same question per invoice instead of applying one
 * answer to all. The change is opt-in via the checkbox: leaving it
 * unchecked and proceeding never touches the customer's balance. */
export function InvoiceBalanceDeleteContent({
  invoice,
  disabled,
  onConfirm,
  onCancel,
}: {
  invoice: InvoiceDeleteSummary &
    Pick<InvoiceDeleteInfo, "balanceEffectApplied">;
  disabled?: boolean;
  onConfirm: (applyBalanceChange: boolean) => void;
  onCancel: () => void;
}) {
  const [applyChange, setApplyChange] = useState(false);
  // Reversing the invoice's stored effect: giving back a من الرصيد draw
  // increases the balance; clawing back leftover overpayment credit
  // decreases it.
  const pendingChange = -invoice.balanceEffectApplied;
  const isIncrease = pendingChange > 0;

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{ar.common.confirmDeleteTitle}</AlertDialogTitle>
        <AlertDialogDescription render={<div />}>
          <InvoiceSummaryDetails invoice={invoice} />
          <p className="pt-2 font-medium text-foreground">
            {isIncrease
              ? ar.invoices.deleteBalanceIncreasePreview
              : ar.invoices.deleteBalanceDecreasePreview}{" "}
            {isIncrease ? "+" : "-"}
            {formatCurrency(Math.abs(pendingChange))}{" "}
            {isIncrease
              ? ar.invoices.deleteBalanceIncreaseReason
              : ar.invoices.deleteBalanceDecreaseReason}
            .
          </p>
          <p className="text-xs">{ar.invoices.deleteBalanceNoAutoChange}</p>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex items-center gap-2 px-1">
        <Checkbox
          id="apply-balance-change-checkbox"
          checked={applyChange}
          onCheckedChange={setApplyChange}
          disabled={disabled}
        />
        <Label
          htmlFor="apply-balance-change-checkbox"
          className="text-sm font-normal"
        >
          {isIncrease
            ? ar.invoices.deleteBalanceIncreaseCheckboxLabel
            : ar.invoices.deleteBalanceDecreaseCheckboxLabel}{" "}
          ({formatCurrency(Math.abs(pendingChange))})
        </Label>
      </div>
      <AlertDialogFooter>
        <Button variant="outline" disabled={disabled} onClick={onCancel}>
          {ar.common.cancel}
        </Button>
        <Button disabled={disabled} onClick={() => onConfirm(applyChange)}>
          {disabled && <Loader2 className="size-4 animate-spin" />}
          {disabled ? "جاري الحذف..." : ar.invoices.deleteConfirmAndDelete}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

export function InvoiceDeleteDialog({
  invoice,
}: {
  invoice: InvoiceDeleteInfo;
}) {
  const [open, setOpen] = useState(false);
  // "confirm" is always shown first; "balance" only follows it when
  // deleting this invoice would actually change رصيد.
  const [stage, setStage] = useState<"confirm" | "balance">("confirm");
  const [isPending, startTransition] = useTransition();
  const hasBalanceEffect = Math.abs(invoice.balanceEffectApplied) > 0.005;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setStage("confirm");
  }

  function handleConfirm() {
    if (hasBalanceEffect) {
      setStage("balance");
      return;
    }
    handleDelete();
  }

  function handleDelete(applyBalanceChange?: boolean) {
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id, { applyBalanceChange });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setStage("confirm");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <Trash2 className="size-4" />
          </Button>
        }
      />
      <AlertDialogContent>
        {stage === "balance" ? (
          <InvoiceBalanceDeleteContent
            invoice={invoice}
            disabled={isPending}
            onConfirm={(applyBalanceChange) => handleDelete(applyBalanceChange)}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {ar.common.confirmDeleteTitle}
              </AlertDialogTitle>
              <AlertDialogDescription render={<div />}>
                <InvoiceSummaryDetails invoice={invoice} />
                <p className="pt-2 font-medium text-foreground">
                  {`سيتم حذف الفاتورة "${invoice.invoiceNumber}" نهائياً.`}
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ar.common.cancel}</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? "جاري الحذف..." : ar.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
