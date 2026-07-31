"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

/**
 * Renders the totals block of an invoice print page, with a print:hidden
 * control letting the admin decide on the spot whether الحساب القديم (the
 * customer's other outstanding invoices) should count toward this
 * printout's الإجمالي الكلي — some customers want it included, some don't,
 * and that's a per-print judgment call, not something the app should
 * hardcode either way.
 */
export function InvoicePrintTotals({
  lang,
  labels,
  itemsTotal,
  previousPayment,
  showPreviousPayment,
  previousDebtsTotal,
}: {
  lang: "ar" | "fr";
  labels: {
    total: string;
    previousPayment: string;
    previousDebts: string;
    grandTotal: string;
    oldAccountPrompt: string;
    includeOldAccount: string;
    excludeOldAccount: string;
  };
  itemsTotal: number;
  previousPayment: number;
  showPreviousPayment: boolean;
  previousDebtsTotal: number;
}) {
  const [includeOldAccount, setIncludeOldAccount] = useState(true);
  const hasOldAccount = previousDebtsTotal > 0.005;
  const effectiveOldAccount = hasOldAccount && includeOldAccount ? previousDebtsTotal : 0;
  const grandTotal = Math.max(0, itemsTotal - previousPayment) + effectiveOldAccount;

  return (
    <>
      {hasOldAccount && (
        <div className="mt-3 space-y-2 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 print:hidden">
          <p className="text-xs font-medium text-foreground">
            {labels.oldAccountPrompt}{" "}
            <span className="font-bold" dir="ltr">
              {formatCurrency(previousDebtsTotal, lang, false)}
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={includeOldAccount ? "default" : "outline"}
              className={cn(
                "flex-1 cursor-pointer",
                includeOldAccount && "ring-2 ring-primary/30",
              )}
              onClick={() => setIncludeOldAccount(true)}
            >
              <Check className="size-4" />
              {labels.includeOldAccount}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!includeOldAccount ? "default" : "outline"}
              className={cn(
                "flex-1 cursor-pointer",
                !includeOldAccount && "ring-2 ring-primary/30",
              )}
              onClick={() => setIncludeOldAccount(false)}
            >
              <X className="size-4" />
              {labels.excludeOldAccount}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-1 text-sm font-semibold text-foreground print:text-xs">
        <p>
          {labels.total}: {formatCurrency(itemsTotal, lang, false)}
        </p>
        {showPreviousPayment && (
          <p>
            {labels.previousPayment}:{" "}
            {formatCurrency(previousPayment, lang, false)}
          </p>
        )}
        {includeOldAccount && hasOldAccount && (
          <p>
            {labels.previousDebts}:{" "}
            {formatCurrency(previousDebtsTotal, lang, false)}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-md border-2 border-gray-400 bg-gray-100 px-4 py-2 print:mt-2 print:py-1.5 print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
        <p className="text-base font-bold print:text-sm">{labels.grandTotal}</p>
        <p className="text-lg font-bold print:text-base">
          {formatCurrency(grandTotal, lang, false)}
        </p>
      </div>
    </>
  );
}
