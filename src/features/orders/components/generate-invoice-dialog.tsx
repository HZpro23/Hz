"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOrCreateInvoiceForOrder } from "@/features/invoices/actions";
import {
  PAYMENT_METHOD_LABELS,
  INVOICE_LANGUAGE_LABELS,
} from "@/features/invoices/schema";
import { ar } from "@/i18n/ar";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { computePaymentStatus } from "@/lib/money";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { BalanceConfirmDialog } from "@/features/invoices/components/balance-confirm-dialog";
import {
  checkBalanceConfirmation,
  capBalanceLines,
  type BalanceConfirmRequest,
} from "@/features/invoices/balance-resolution";
import type { InvoiceLanguage, PaymentMethod } from "@/generated/prisma/client";

type PaymentLine = { method: PaymentMethod; amount: number };

export function GenerateInvoiceDialog({
  orderId,
  orderTotal,
  customerBalance = 0,
  hasCustomer = false,
}: {
  orderId: string;
  orderTotal: number;
  customerBalance?: number;
  hasCustomer?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<InvoiceLanguage>("AR");
  const [lines, setLines] = useState<PaymentLine[]>([
    { method: "CASH", amount: orderTotal },
  ]);
  const [isPending, startTransition] = useTransition();

  const canUseBalance = hasCustomer && customerBalance > 0.005;
  const totalPaid = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const remaining = orderTotal - totalPaid;
  const previewStatus = computePaymentStatus(orderTotal, totalPaid);

  function updateLine(index: number, patch: Partial<PaymentLine>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { method: "CASH", amount: 0 }]);
  }

  function addBalanceLine() {
    const balanceUsed = lines
      .filter((line) => line.method === "BALANCE")
      .reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const remainingBalance = Math.max(0, customerBalance - balanceUsed);
    const amount = Math.min(remainingBalance, Math.max(0, remaining)) || remainingBalance;
    setLines((prev) => [...prev, { method: "BALANCE", amount }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const [confirmRequest, setConfirmRequest] = useState<BalanceConfirmRequest | null>(
    null,
  );
  const [pendingPayments, setPendingPayments] = useState<PaymentLine[] | null>(null);

  function submitPayments(payments: PaymentLine[]) {
    if (payments.some((line) => line.method === "BALANCE") && !hasCustomer) {
      toast.error(ar.invoices.noCustomerForBalance);
      return;
    }

    startTransition(async () => {
      const result = await getOrCreateInvoiceForOrder(orderId, {
        language,
        payments,
      });
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  function handleSubmit() {
    const payments = lines.filter((line) => line.amount > 0);
    const request = checkBalanceConfirmation({
      total: orderTotal,
      customerBalance,
      hasCustomer,
      lines: payments,
    });
    if (request) {
      setPendingPayments(payments);
      setConfirmRequest(request);
      return;
    }
    submitPayments(payments);
  }

  function cancelConfirm() {
    setConfirmRequest(null);
    setPendingPayments(null);
  }

  function resolveUseAvailable() {
    if (!pendingPayments || confirmRequest?.kind !== "insufficient") return;
    const payments = capBalanceLines(pendingPayments, confirmRequest.availableBalance);
    setConfirmRequest(null);
    submitPayments(payments);
  }

  function resolveGoNegative() {
    if (!pendingPayments) return;
    setConfirmRequest(null);
    submitPayments(pendingPayments);
  }

  function resolveUseBalance() {
    if (!pendingPayments || confirmRequest?.kind !== "offer-balance") return;
    const amount = Math.min(confirmRequest.remaining, confirmRequest.availableBalance);
    setConfirmRequest(null);
    submitPayments([...pendingPayments, { method: "BALANCE", amount }]);
  }

  function resolveDecline() {
    if (!pendingPayments) return;
    setConfirmRequest(null);
    submitPayments(pendingPayments);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="w-full cursor-pointer">
            <FileText className="size-4" />
            توليد فاتورة
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء الفاتورة</DialogTitle>
          <DialogDescription>
            اختر لغة الفاتورة وطرق الدفع والمبالغ، ويمكنك دمج أكثر من طريقة
            دفع لنفس الفاتورة (مثال: نقدًا + من الرصيد).
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={isPending} className="contents">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>لغة الفاتورة</Label>
            <Select
              items={INVOICE_LANGUAGE_LABELS}
              value={language}
              onValueChange={(value) => setLanguage(value as InvoiceLanguage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AR">العربية</SelectItem>
                <SelectItem value="FR">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{ar.invoices.payments}</Label>
              <div className="flex gap-2">
                {canUseBalance && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={addBalanceLine}
                  >
                    {ar.invoices.availableBalance}: {formatCurrency(customerBalance)}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={addLine}
                >
                  <Plus className="size-4" />
                  {ar.invoices.addPayment}
                </Button>
              </div>
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {ar.invoices.noPaymentLines}
              </p>
            ) : (
              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 items-start gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">{ar.invoices.paymentMethod}</Label>
                      <Select
                        items={PAYMENT_METHOD_LABELS}
                        value={line.method}
                        onValueChange={(value) => {
                          if (!value) return;
                          updateLine(index, { method: value as PaymentMethod });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_METHOD_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      {line.method === "BALANCE" && (
                        <p
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs",
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
                    <div className="space-y-1">
                      <Label className="text-xs">{ar.invoices.amountPaid}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.amount}
                        onChange={(event) =>
                          updateLine(index, {
                            amount: event.target.valueAsNumber || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="hidden text-xs sm:block">&nbsp;</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <PaymentStatusBadge status={previewStatus} />
              <span>
                {ar.invoices.totalPaidLabel}: {formatCurrency(totalPaid)}
              </span>
              {remaining > 0.005 && (
                <span className="text-muted-foreground">
                  {ar.invoices.remainingAfterPayments}: {formatCurrency(remaining)}
                </span>
              )}
              {remaining < -0.005 && (
                <Badge variant="secondary">{ar.invoices.overpaidWillBecomeCredit}</Badge>
              )}
            </div>
          </div>

          <Button
            className="w-full cursor-pointer"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
          </Button>
        </div>
        </fieldset>
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
