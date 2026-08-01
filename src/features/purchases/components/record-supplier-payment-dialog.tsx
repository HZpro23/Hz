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
import { recordSupplierPayment } from "@/features/purchases/actions";
import { formatCurrency } from "@/lib/currency";
import type { PaymentMethod } from "@/generated/prisma/client";

export function RecordSupplierPaymentDialog({
  purchaseOrderId,
  remaining,
}: {
  purchaseOrderId: string;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(remaining);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setAmount(remaining);
  }

  function handleMethodChange(value: string | null) {
    if (!value) return;
    setMethod(value as PaymentMethod);
  }

  function handleSubmit(formData: FormData) {
    const note = String(formData.get("note") ?? "").trim();

    if (!(amount > 0)) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }
    if (amount > remaining + 0.005) {
      toast.error("المبلغ أكبر من المبلغ المتبقي");
      return;
    }

    startTransition(async () => {
      const result = await recordSupplierPayment(purchaseOrderId, {
        amount,
        method,
        note,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تسجيل الدفعة بنجاح");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="cursor-pointer" size="sm">
            <Wallet className="size-4" />
            تسجيل دفعة
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة للمورد</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <fieldset disabled={isPending} className="contents space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-payment-amount">المبلغ المدفوع</Label>
              <Input
                id="supplier-payment-amount"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.valueAsNumber || 0)
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                المبلغ المتبقي: {formatCurrency(remaining)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select
                items={PAYMENT_METHOD_LABELS}
                value={method}
                onValueChange={handleMethodChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS)
                    .filter(([value]) => value !== "BALANCE")
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-payment-note">ملاحظة (اختياري)</Label>
              <Textarea id="supplier-payment-note" name="note" rows={2} />
            </div>
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
