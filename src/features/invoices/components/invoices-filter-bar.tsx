"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PAYMENT_STATUS_LABELS } from "@/features/invoices/schema";

const ALL_STATUSES = "جميع الحالات";

export function InvoicesFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">حالة الدفع</Label>
        <Select
          value={searchParams.get("paymentStatus") ?? ALL_STATUSES}
          onValueChange={(value) => {
            if (!value) return;
            updateParam("paymentStatus", value === ALL_STATUSES ? "" : value);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={ALL_STATUSES} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>{ALL_STATUSES}</SelectItem>
            {Object.values(PAYMENT_STATUS_LABELS).map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
