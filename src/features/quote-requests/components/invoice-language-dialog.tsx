"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateInvoiceForQuote } from "@/features/invoices/actions";

export function InvoiceLanguageDialog({ quoteId }: { quoteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="cursor-pointer">
            <FileText className="size-4" />
            توليد فاتورة
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>لغة الفاتورة</DialogTitle>
          <DialogDescription>
            اختر اللغة التي تريد إنشاء الفاتورة بها، ويمكنك بعد ذلك تعديل
            المنتجات والأسعار وإضافة أو حذف منتجات من الفاتورة.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <form action={generateInvoiceForQuote.bind(null, quoteId, "AR")}>
            <Button type="submit" className="w-full cursor-pointer">
              العربية
            </Button>
          </form>
          <form action={generateInvoiceForQuote.bind(null, quoteId, "FR")}>
            <Button
              type="submit"
              variant="outline"
              className="w-full cursor-pointer"
            >
              Français
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
