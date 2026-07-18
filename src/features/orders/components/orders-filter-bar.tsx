"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ORDER_STATUS_LABELS,
  ORDER_INVOICE_FILTER_LABELS,
} from "@/features/orders/schema";

const ALL_STATUSES = "جميع الحالات";
const ALL_INVOICE_FILTER = "الكل";

export function OrdersFilterBar() {
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
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end lg:flex-nowrap lg:items-center justify-center items-center">
      <div className="min-w-0 space-y-1.5 sm:w-44 sm:shrink-0">
        <Label className="text-xs text-muted-foreground">الحالة</Label>
        <Select
          value={searchParams.get("status") ?? ALL_STATUSES}
          onValueChange={(value) => {
            if (!value) return;
            updateParam("status", value === ALL_STATUSES ? "" : value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={ALL_STATUSES} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>{ALL_STATUSES}</SelectItem>
            {Object.values(ORDER_STATUS_LABELS).map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-1.5 sm:w-40 sm:shrink-0">
        <Label className="text-xs text-muted-foreground">من تاريخ</Label>
        <Input
          type="date"
          className="w-full"
          defaultValue={searchParams.get("from") ?? ""}
          onChange={(event) => updateParam("from", event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-1.5 sm:w-40 sm:shrink-0">
        <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
        <Input
          type="date"
          className="w-full"
          defaultValue={searchParams.get("to") ?? ""}
          onChange={(event) => updateParam("to", event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-1.5 sm:w-40 sm:shrink-0">
        <Label className="text-xs text-muted-foreground">الفاتورة</Label>
        <Select
          value={searchParams.get("invoiceFilter") ?? ALL_INVOICE_FILTER}
          onValueChange={(value) => {
            if (!value) return;
            updateParam(
              "invoiceFilter",
              value === ALL_INVOICE_FILTER ? "" : value,
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={ALL_INVOICE_FILTER} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_INVOICE_FILTER}>
              {ALL_INVOICE_FILTER}
            </SelectItem>
            {Object.values(ORDER_INVOICE_FILTER_LABELS).map((label) => (
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
