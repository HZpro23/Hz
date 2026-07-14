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
            اختر اللغة التي تريد إنشاء الفاتورة بها
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Button
            nativeButton={false}
            render={
              <a
                href={`/dashboard/quote-requests/${quoteId}/invoice?lang=ar`}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            العربية
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={`/dashboard/quote-requests/${quoteId}/invoice?lang=fr`}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Français
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
