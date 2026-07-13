"use client";

import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportExportButtons({ type }: { type: string }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false} render={<a href={`/api/reports/export?type=${type}&format=csv`} />}
      >
        <FileText className="size-4" />
        تصدير CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false} render={<a href={`/api/reports/export?type=${type}&format=xlsx`} />}
      >
        <FileSpreadsheet className="size-4" />
        تصدير Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" />
        طباعة / PDF
      </Button>
    </div>
  );
}
