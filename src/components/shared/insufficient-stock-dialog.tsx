"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type StockWarning = {
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
} | null;

export function InsufficientStockDialog({
  warning,
  onClose,
}: {
  warning: StockWarning;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={Boolean(warning)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>الكمية غير متوفرة في المخزون</AlertDialogTitle>
          <AlertDialogDescription>
            {warning && (
              <>
                الكمية المطلوبة ({warning.requestedQuantity.toLocaleString("ar")})
                من &quot;{warning.productName}&quot; أكبر من الكمية المتوفرة حالياً
                في المخزون ({warning.availableQuantity.toLocaleString("ar")}).
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="cursor-pointer" onClick={onClose}>
            حسناً
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
