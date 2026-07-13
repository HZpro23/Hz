"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  quoteResponseSchema,
  type QuoteResponseInput,
  type QuoteResponseOutput,
} from "@/features/quote-requests/schema";
import { saveQuoteResponse } from "@/features/quote-requests/actions";

export function QuoteResponseForm({
  quoteId,
  initialPrice,
  initialMessage,
  disabled,
}: {
  quoteId: string;
  initialPrice: number | null;
  initialMessage: string | null;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuoteResponseInput, unknown, QuoteResponseOutput>({
    resolver: zodResolver(quoteResponseSchema),
    defaultValues: {
      price: initialPrice ?? 0,
      message: initialMessage ?? "",
    },
  });

  function onSubmit(values: QuoteResponseOutput) {
    startTransition(async () => {
      const result = await saveQuoteResponse(quoteId, values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم حفظ عرض السعر بنجاح");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {disabled && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          كمية المنتج في المخزون صفر، لا يمكن حفظ عرض السعر حتى يتوفر المنتج
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="quote-price">السعر</Label>
        <Input
          id="quote-price"
          type="number"
          min={0}
          step="0.01"
          disabled={disabled}
          {...register("price")}
        />
        {errors.price && (
          <p className="text-sm text-destructive">{errors.price.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="quote-message">رسالة مخصصة للعميل (اختياري)</Label>
        <Textarea
          id="quote-message"
          rows={4}
          disabled={disabled}
          {...register("message")}
        />
      </div>
      <Button
        type="submit"
        className="cursor-pointer"
        disabled={isPending || disabled}
      >
        {isPending ? "جاري الحفظ..." : "حفظ عرض السعر"}
      </Button>
    </form>
  );
}
