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
import { QUOTE_STATUS_LABELS } from "@/features/quote-requests/schema";

export function QuoteRequestsFilterBar() {
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
        <Label className="text-xs text-muted-foreground">الحالة</Label>
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(value) => {
            if (!value) return;
            updateParam("status", value === "all" ? "" : value);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.values(QUOTE_STATUS_LABELS).map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">من تاريخ</Label>
        <Input
          type="date"
          className="w-full sm:w-40"
          defaultValue={searchParams.get("from") ?? ""}
          onChange={(event) => updateParam("from", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
        <Input
          type="date"
          className="w-full sm:w-40"
          defaultValue={searchParams.get("to") ?? ""}
          onChange={(event) => updateParam("to", event.target.value)}
        />
      </div>
    </div>
  );
}
