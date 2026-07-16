"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
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
import { ar } from "@/i18n/ar";
import type { PaymentMethod } from "@/generated/prisma/client";

export function RecordPaymentDialog({
  invoiceId,
  remaining,
}: {
  invoiceId: string;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const amount = Number(formData.get("amount"));
    const note = String(formData.get("note") ?? "").trim();

    if (!(amount > 0)) {
      toast.error(ar.invoices.invalidAmount);
      return;
    }

    startTransition(async () => {
      const result = await recordPayment(invoiceId, { amount, method, note });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تسجيل الدفعة بنجاح");
      setOpen(false);
    });
  }

  return (
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
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{ar.invoices.amountPaid}</Label>
            <Input
              id="payment-amount"
              name="amount"
              type="number"
              min={0}
              max={remaining}
              step="0.01"
              defaultValue={remaining}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{ar.invoices.paymentMethod}</Label>
            <Select
              items={PAYMENT_METHOD_LABELS}
              value={method}
              onValueChange={(value) => setMethod(value as PaymentMethod)}
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
            {isPending ? "جاري الحفظ..." : ar.common.save}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
