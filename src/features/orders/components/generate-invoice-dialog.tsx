"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
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
  PAYMENT_STATUS_LABELS,
  INVOICE_LANGUAGE_LABELS,
} from "@/features/invoices/schema";
import { ar } from "@/i18n/ar";
import { formatCurrency } from "@/lib/currency";
import type {
  InvoiceLanguage,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/client";

export function GenerateInvoiceDialog({
  orderId,
  orderTotal,
}: {
  orderId: string;
  orderTotal: number;
}) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<InvoiceLanguage>("AR");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");
  const [paidAmount, setPaidAmount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await getOrCreateInvoiceForOrder(orderId, {
        language,
        paymentMethod,
        paymentStatus,
        paidAmount,
      });
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="cursor-pointer">
            <FileText className="size-4" />
            توليد فاتورة
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء الفاتورة</DialogTitle>
          <DialogDescription>
            اختر لغة الفاتورة وحالة الدفع، ويمكنك بعد ذلك تعديل المنتجات
            والأسعار من صفحة الفاتورة.
          </DialogDescription>
        </DialogHeader>

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

          <div className="space-y-2">
            <Label>{ar.invoices.paymentMethod}</Label>
            <Select
              items={PAYMENT_METHOD_LABELS}
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(value as PaymentMethod)
              }
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
            <Label>{ar.invoices.paymentStatus}</Label>
            <Select
              items={PAYMENT_STATUS_LABELS}
              value={paymentStatus}
              onValueChange={(value) =>
                setPaymentStatus(value as PaymentStatus)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_STATUS_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {paymentStatus === "PARTIALLY_PAID" && (
            <div className="space-y-2">
              <Label htmlFor="generate-invoice-paid-amount">
                {ar.invoices.amountPaid} (الإجمالي: {formatCurrency(orderTotal)})
              </Label>
              <Input
                id="generate-invoice-paid-amount"
                type="number"
                min={0}
                max={orderTotal}
                step="0.01"
                value={paidAmount}
                onChange={(event) =>
                  setPaidAmount(event.target.valueAsNumber || 0)
                }
              />
            </div>
          )}

          <Button
            className="w-full cursor-pointer"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
