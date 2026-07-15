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
import { generateInvoiceForOrder } from "@/features/invoices/actions";

export function GenerateInvoiceDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="cursor-pointer">
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
          <form action={generateInvoiceForOrder.bind(null, orderId, "AR")}>
            <Button type="submit" className="w-full cursor-pointer">
              العربية
            </Button>
          </form>
          <form action={generateInvoiceForOrder.bind(null, orderId, "FR")}>
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
