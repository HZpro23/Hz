"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Wallet, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/schema";
import { recordPayment } from "@/features/invoices/actions";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { ar } from "@/i18n/ar";
import { BalanceConfirmDialog } from "@/features/invoices/components/balance-confirm-dialog";
import {
  checkSinglePaymentConfirmation,
  type BalanceConfirmRequest,
} from "@/features/invoices/balance-resolution";
import type { PaymentMethod } from "@/generated/prisma/client";

export function RecordPaymentDialog({
  invoiceId,
  remaining,
  customerBalance = 0,
  hasCustomer = false,
}: {
  invoiceId: string;
  remaining: number;
  customerBalance?: number;
  hasCustomer?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(remaining);
  const [isPending, startTransition] = useTransition();

  function handleMethodChange(value: string | null) {
    if (!value) return;
    const nextMethod = value as PaymentMethod;
    setMethod(nextMethod);
    if (nextMethod === "BALANCE") {
      setAmount(remaining);
    }
  }

  const [confirmRequest, setConfirmRequest] = useState<BalanceConfirmRequest | null>(
    null,
  );
  const [pending, setPending] = useState<{
    amount: number;
    method: PaymentMethod;
    note: string;
  } | null>(null);

  function submitPayment(
    paidAmount: number,
    paidMethod: PaymentMethod,
    note: string,
    thenAlsoBalance?: number,
  ) {
    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        amount: paidAmount,
        method: paidMethod,
        note,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (thenAlsoBalance && thenAlsoBalance > 0) {
        const second = await recordPayment(invoiceId, {
          amount: thenAlsoBalance,
          method: "BALANCE",
        });
        if (second.error) {
          toast.error(second.error);
          return;
        }
      }
      toast.success("تم تسجيل الدفعة بنجاح");
      setOpen(false);
    });
  }

  function handleSubmit(formData: FormData) {
    const note = String(formData.get("note") ?? "").trim();

    if (!(amount > 0)) {
      toast.error(ar.invoices.invalidAmount);
      return;
    }

    if (method === "BALANCE" && !hasCustomer) {
      toast.error(ar.invoices.noCustomerForBalance);
      return;
    }

    const request = checkSinglePaymentConfirmation({
      remainingBeforePayment: remaining,
      method,
      amount,
      customerBalance,
      hasCustomer,
    });
    if (request) {
      setPending({ amount, method, note });
      setConfirmRequest(request);
      return;
    }

    submitPayment(amount, method, note);
  }

  function cancelConfirm() {
    setConfirmRequest(null);
    setPending(null);
  }

  function resolveUseAvailable() {
    if (!pending || confirmRequest?.kind !== "insufficient") return;
    setConfirmRequest(null);
    submitPayment(confirmRequest.availableBalance, "BALANCE", pending.note);
  }

  function resolveGoNegative() {
    if (!pending) return;
    setConfirmRequest(null);
    submitPayment(pending.amount, pending.method, pending.note);
  }

  function resolveUseBalance() {
    if (!pending || confirmRequest?.kind !== "offer-balance") return;
    const balanceAmount = Math.min(confirmRequest.remaining, confirmRequest.availableBalance);
    setConfirmRequest(null);
    submitPayment(pending.amount, pending.method, pending.note, balanceAmount);
  }

  function resolveDecline() {
    if (!pending) return;
    setConfirmRequest(null);
    submitPayment(pending.amount, pending.method, pending.note);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="cursor-pointer" size="sm">
            <Wallet className="size-4" />
            {ar.invoices.recordPayment}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ar.invoices.recordPayment}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
        <fieldset disabled={isPending} className="contents space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{ar.invoices.amountPaid}</Label>
            <Input
              id="payment-amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.valueAsNumber || 0)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {ar.invoices.remainingBalance}: {formatCurrency(remaining)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{ar.invoices.paymentMethod}</Label>
            <Select
              items={PAYMENT_METHOD_LABELS}
              value={method}
              onValueChange={handleMethodChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {method === "BALANCE" && (
              <p
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs",
                  !hasCustomer
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                )}
              >
                {!hasCustomer
                  ? ar.invoices.noCustomerForBalance
                  : `${ar.invoices.availableBalance}: ${formatCurrency(customerBalance)}`}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-note">
              {ar.invoices.paymentNote} (اختياري)
            </Label>
            <Textarea id="payment-note" name="note" rows={2} />
          </div>
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "جاري الحفظ..." : ar.common.save}
          </Button>
        </fieldset>
        </form>
      </DialogContent>
    </Dialog>

    <BalanceConfirmDialog
      request={confirmRequest}
      onCancel={cancelConfirm}
      onUseAvailable={resolveUseAvailable}
      onGoNegative={resolveGoNegative}
      onUseBalance={resolveUseBalance}
      onDecline={resolveDecline}
    />
    </>
  );
}
