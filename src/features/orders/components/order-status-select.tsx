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
import { updateOrderStatus } from "@/features/orders/actions";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VALUE_BY_LABEL,
} from "@/features/orders/schema";

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(label: string | null) {
    if (!label) return;
    const value = ORDER_STATUS_VALUE_BY_LABEL[label];
    if (!value) return;
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, value);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تحديث حالة الطلب بنجاح");
    });
  }

  return (
    <Select
      value={ORDER_STATUS_LABELS[status] ?? status}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={label}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
