"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Merge, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PaymentStatusBadge } from "@/features/invoices/components/payment-status-badge";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { ar } from "@/i18n/ar";
import {
  mergeOldInvoicesIntoInvoice,
  type MergeOldInvoicesInput,
} from "@/features/invoices/merge-actions";
import type { PaymentStatus } from "@/generated/prisma/client";

export type MergeableInvoice = {
  id: string;
  invoiceNumber: string;
  remaining: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
};

export function MergeOldInvoicesDialog({
  invoiceId,
  invoices,
}: {
  invoiceId: string;
  invoices: MergeableInvoice[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(invoices.map((invoice) => invoice.id)),
  );
  const [mode, setMode] = useState<MergeOldInvoicesInput["mode"]>("PRICE_ONLY");
  const [cancelOldInvoices, setCancelOldInvoices] = useState(true);
  const [isPending, startTransition] = useTransition();

  const allSelected = selected.size === invoices.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(invoices.map((i) => i.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) {
      toast.error(ar.invoices.mergeOldInvoicesNoSelection);
      return;
    }
    startTransition(async () => {
      const result = await mergeOldInvoicesIntoInvoice(invoiceId, {
        sourceInvoiceIds: Array.from(selected),
        mode,
        cancelOldInvoices,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(ar.invoices.mergeOldInvoicesSuccess);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Merge className="size-4" />
            {ar.invoices.mergeOldInvoices}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ar.invoices.mergeOldInvoicesTitle}</DialogTitle>
          <DialogDescription>
            {ar.invoices.mergeOldInvoicesDescription}
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={isPending} className="contents space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                {ar.invoices.outstandingInvoices}
              </Label>
              <button
                type="button"
                className="cursor-pointer text-xs text-muted-foreground underline"
                onClick={toggleAll}
              >
                {ar.invoices.mergeOldInvoicesSelectAll}
              </button>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {invoices.map((invoice) => (
                <label
                  key={invoice.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selected.has(invoice.id)}
                    onCheckedChange={() => toggleOne(invoice.id)}
                  />
                  <span dir="ltr" className="font-medium">
                    {invoice.invoiceNumber}
                  </span>
                  <PaymentStatusBadge status={invoice.paymentStatus} />
                  <span className="ms-auto text-muted-foreground">
                    {ar.invoices.mergeOldInvoicesRemaining}:{" "}
                    {formatCurrency(invoice.remaining)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {ar.invoices.mergeOldInvoicesMode}
            </Label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setMode("PRICE_ONLY")}
                className={cn(
                  "cursor-pointer rounded-md border p-2 text-start",
                  mode === "PRICE_ONLY"
                    ? "border-primary bg-primary/5"
                    : "border-input",
                )}
              >
                <p className="text-sm font-medium">
                  {ar.invoices.mergeOldInvoicesModePriceOnly}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ar.invoices.mergeOldInvoicesModePriceOnlyHint}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("PRODUCTS")}
                className={cn(
                  "cursor-pointer rounded-md border p-2 text-start",
                  mode === "PRODUCTS"
                    ? "border-primary bg-primary/5"
                    : "border-input",
                )}
              >
                <p className="text-sm font-medium">
                  {ar.invoices.mergeOldInvoicesModeProducts}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ar.invoices.mergeOldInvoicesModeProductsHint}
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cancel-old-invoices"
              checked={cancelOldInvoices}
              onCheckedChange={setCancelOldInvoices}
            />
            <Label htmlFor="cancel-old-invoices" className="text-sm font-normal">
              {ar.invoices.mergeOldInvoicesCancelOld}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {ar.invoices.mergeOldInvoicesCancelOldHint}
          </p>

          <Button
            type="button"
            className="w-full cursor-pointer"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "جاري الدمج..." : ar.invoices.mergeOldInvoicesSubmit}
          </Button>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
