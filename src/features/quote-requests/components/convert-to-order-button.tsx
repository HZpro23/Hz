"use client";

import { useTransition } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertQuoteToOrder } from "@/features/quote-requests/actions";

export function ConvertToOrderButton({
  quoteId,
  disabled,
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await convertQuoteToOrder(quoteId);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      {disabled && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          كمية المنتج في المخزون صفر، لا يمكن التحويل إلى طلب حتى يتوفر المنتج
        </p>
      )}
      <Button
        onClick={handleClick}
        disabled={isPending || disabled}
        variant="outline"
        className="cursor-pointer"
      >
        <ArrowLeftRight className="size-4" />
        {isPending ? "جاري التحويل..." : "تحويل إلى طلب"}
      </Button>
    </div>
  );
}
