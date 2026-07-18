"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { ar } from "@/i18n/ar";
import type { BalanceConfirmRequest } from "@/features/invoices/balance-resolution";

export function BalanceConfirmDialog({
  request,
  onCancel,
  onUseAvailable,
  onGoNegative,
  onUseBalance,
  onDecline,
}: {
  request: BalanceConfirmRequest | null;
  onCancel: () => void;
  onUseAvailable: () => void;
  onGoNegative: () => void;
  onUseBalance: () => void;
  onDecline: () => void;
}) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        {request?.kind === "insufficient" && (
          <>
            <DialogHeader>
              <DialogTitle>{ar.invoices.insufficientBalanceTitle}</DialogTitle>
              <DialogDescription>
                رصيد العميل الحالي هو {formatCurrency(request.availableBalance)}، بينما
                المبلغ المطلوب {formatCurrency(request.amountNeeded)}. كيف تريد المتابعة؟
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button className="cursor-pointer" onClick={onUseAvailable}>
                {ar.invoices.insufficientBalanceUseAvailable}
              </Button>
              <p className="text-xs text-muted-foreground">
                {ar.invoices.insufficientBalanceUseAvailableHint}
              </p>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={onGoNegative}
              >
                {ar.invoices.insufficientBalanceGoNegative}
              </Button>
              <p className="text-xs text-muted-foreground">
                {ar.invoices.insufficientBalanceGoNegativeHint}
              </p>
            </div>
          </>
        )}
        {request?.kind === "offer-balance" && (
          <>
            <DialogHeader>
              <DialogTitle>{ar.invoices.offerBalanceTitle}</DialogTitle>
              <DialogDescription>
                لدى العميل رصيد متاح قدره {formatCurrency(request.availableBalance)}.
                يتبقى {formatCurrency(request.remaining)} على الفاتورة. هل تريد استخدام
                الرصيد لتغطية المبلغ المتبقي؟
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Button className="flex-1 cursor-pointer" onClick={onUseBalance}>
                {ar.invoices.offerBalanceYes}
              </Button>
              <Button
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={onDecline}
              >
                {ar.invoices.offerBalanceNo}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
