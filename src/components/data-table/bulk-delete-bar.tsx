"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ar } from "@/i18n/ar";

type DeleteResult = { error?: string } | void;

export function BulkDeleteBar({
  count,
  onConfirm,
  onClearSelection,
}: {
  count: number;
  onConfirm: () => Promise<DeleteResult>;
  onClearSelection: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
      <p className="text-sm font-medium">
        {count.toLocaleString("ar")} عنصر محدد
      </p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={onClearSelection}
        >
          إلغاء التحديد
        </Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                <Trash2 className="size-4" />
                حذف المحدد
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ar.common.confirmDeleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف {count.toLocaleString("ar")} عنصر نهائياً. لا يمكن
                التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ar.common.cancel}</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? "جاري الحذف..." : ar.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
