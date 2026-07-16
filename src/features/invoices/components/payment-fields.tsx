"use client";

import { Controller, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type InvoiceInput,
  type InvoiceOutput,
} from "@/features/invoices/schema";
import { ar } from "@/i18n/ar";

export function PaymentFieldsSection({
  control,
  paymentStatus,
  errors,
}: {
  control: Control<InvoiceInput, unknown, InvoiceOutput>;
  paymentStatus: string;
  errors?: { paidAmount?: { message?: string } };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{ar.invoices.paymentMethod}</Label>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <Select
              items={PAYMENT_METHOD_LABELS}
              value={field.value}
              onValueChange={field.onChange}
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
          )}
        />
      </div>
      <div className="space-y-2">
        <Label>{ar.invoices.paymentStatus}</Label>
        <Controller
          control={control}
          name="paymentStatus"
          render={({ field }) => (
            <Select
              items={PAYMENT_STATUS_LABELS}
              value={field.value}
              onValueChange={field.onChange}
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
          )}
        />
      </div>
      {paymentStatus === "PARTIALLY_PAID" && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice-paid-amount">{ar.invoices.amountPaid}</Label>
          <Controller
            control={control}
            name="paidAmount"
            render={({ field }) => (
              <Input
                id="invoice-paid-amount"
                type="number"
                min={0}
                step="0.01"
                value={Number(field.value ?? 0)}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
              />
            )}
          />
          {errors?.paidAmount && (
            <p className="text-sm text-destructive">
              {errors.paidAmount.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
