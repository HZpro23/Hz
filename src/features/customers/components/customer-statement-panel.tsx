"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Lets the admin pick a date range and export a printable statement (list
 * of invoices + payments in that range, with totals) as a PDF via the
 * browser's print dialog — same "طباعة / حفظ كـ PDF" convention used for
 * invoices.
 */
export function CustomerStatementPanel({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    if (!from || !to) {
      setError("الرجاء اختيار تاريخ البداية وتاريخ النهاية");
      return;
    }
    if (from > to) {
      setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو يساويه");
      return;
    }
    setError(null);
    router.push(
      `/dashboard/customers/${customerId}/statement?from=${from}&to=${to}`,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>كشف حساب العميل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          اختر فترة زمنية لعرض فواتير ودفعات العميل خلالها، ثم صدّرها كملف
          PDF.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label
              htmlFor="statement-from"
              className="text-xs text-muted-foreground"
            >
              من تاريخ
            </Label>
            <Input
              id="statement-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="statement-to"
              className="text-xs text-muted-foreground"
            >
              إلى تاريخ
            </Label>
            <Input
              id="statement-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setError(null);
              }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleExport} className="w-full cursor-pointer">
          <FileDown className="size-4" />
          تصدير كشف الحساب PDF
        </Button>
      </CardContent>
    </Card>
  );
}
