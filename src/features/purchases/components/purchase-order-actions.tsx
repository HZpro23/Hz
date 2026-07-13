"use client";

import { useTransition } from "react";
import { PackageCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "@/features/purchases/actions";

export function PurchaseOrderActions({
  purchaseOrderId,
}: {
  purchaseOrderId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleReceive() {
    startTransition(async () => {
      const result = await receivePurchaseOrder(purchaseOrderId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم استلام البضاعة وتحديث المخزون بنجاح");
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelPurchaseOrder(purchaseOrderId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم إلغاء أمر الشراء");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleReceive} disabled={isPending}>
        <PackageCheck className="size-4" />
        استلام البضاعة
      </Button>
      <Button variant="outline" onClick={handleCancel} disabled={isPending}>
        <XCircle className="size-4" />
        إلغاء الأمر
      </Button>
    </div>
  );
}
