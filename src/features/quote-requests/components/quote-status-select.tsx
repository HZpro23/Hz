"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateQuoteStatus } from "@/features/quote-requests/actions";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_VALUE_BY_LABEL,
} from "@/features/quote-requests/schema";

export function QuoteStatusSelect({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(label: string | null) {
    if (!label) return;
    const value = QUOTE_STATUS_VALUE_BY_LABEL[label];
    if (!value) return;
    startTransition(async () => {
      const result = await updateQuoteStatus(quoteId, value);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تحديث الحالة بنجاح");
    });
  }

  return (
    <Select
      value={QUOTE_STATUS_LABELS[status] ?? status}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={label}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
