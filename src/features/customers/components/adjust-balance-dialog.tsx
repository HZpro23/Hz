"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Wallet, Plus, Minus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { ar } from "@/i18n/ar";
import { adjustCustomerBalanceManual } from "@/features/customers/actions";

type Direction = "increase" | "decrease";

export function AdjustBalanceDialog({
  customerId,
  currentBalance,
}: {
  customerId: string;
  currentBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("increase");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const signedDelta = direction === "increase" ? amount : -amount;
  const newBalance = currentBalance + signedDelta;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setDirection("increase");
      setAmount(0);
      setNote("");
    }
  }

  function handleSubmit() {
    if (!(amount > 0)) {
      toast.error(ar.invoices.invalidAmount);
      return;
    }

    startTransition(async () => {
      const result = await adjustCustomerBalanceManual(customerId, {
        delta: signedDelta,
        note: note.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تعديل الرصيد بنجاح");
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="w-full cursor-pointer">
            <Wallet className="size-4" />
            {ar.customers.adjustBalance}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ar.customers.adjustBalanceTitle}</DialogTitle>
          <DialogDescription>{ar.customers.adjustBalanceDescription}</DialogDescription>
        </DialogHeader>

        <fieldset disabled={isPending} className="contents">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === "increase" ? "default" : "outline"}
              className={cn(
                "cursor-pointer justify-center gap-1.5",
                direction === "increase" &&
                  "bg-emerald-600 text-white hover:bg-emerald-600/90",
              )}
              onClick={() => setDirection("increase")}
            >
              <Plus className="size-4" />
              {ar.customers.increaseBalance}
            </Button>
            <Button
              type="button"
              variant={direction === "decrease" ? "destructive" : "outline"}
              className="cursor-pointer justify-center gap-1.5"
              onClick={() => setDirection("decrease")}
            >
              <Minus className="size-4" />
              {ar.customers.decreaseBalance}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-balance-amount">
              {ar.customers.adjustmentAmount}
            </Label>
            <Input
              id="adjust-balance-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount || ""}
              onChange={(event) =>
                setAmount(Math.max(0, event.target.valueAsNumber || 0))
              }
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-balance-note">{ar.customers.adjustmentNote}</Label>
            <Textarea
              id="adjust-balance-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                {ar.customers.currentBalance}
              </p>
              <p className="font-medium">{formatCurrency(currentBalance)}</p>
            </div>
            <div className="text-end">
              <p className="text-xs text-muted-foreground">
                {ar.customers.balanceAfterAdjustment}
              </p>
              <p
                className={cn(
                  "font-medium",
                  newBalance < 0
                    ? "text-destructive"
                    : newBalance > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : undefined,
                )}
              >
                {formatCurrency(newBalance)}
              </p>
            </div>
          </div>

          <Button
            className="w-full cursor-pointer"
            disabled={isPending || !(amount > 0)}
            onClick={handleSubmit}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "جاري الحفظ..." : ar.customers.confirmAdjustment}
          </Button>
        </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
