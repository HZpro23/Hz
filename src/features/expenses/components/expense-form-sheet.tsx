"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  expenseSchema,
  type ExpenseInput,
  type ExpenseOutput,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_VALUE_BY_LABEL,
} from "@/features/expenses/schema";
import { createExpense, updateExpense } from "@/features/expenses/actions";
import { ar } from "@/i18n/ar";

type ExpenseRecord = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: Date;
} | null;

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ExpenseFormSheet({
  open,
  expense,
}: {
  open: boolean;
  expense?: ExpenseRecord;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseInput, unknown, ExpenseOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: (expense?.category as ExpenseOutput["category"]) ?? "OTHER",
      amount: expense?.amount ? Number(expense.amount) : 0,
      description: expense?.description ?? "",
      date: expense
        ? toDateInputValue(new Date(expense.date))
        : toDateInputValue(new Date()),
    },
  });

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("edit");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSubmit(values: ExpenseOutput) {
    startTransition(async () => {
      const result = expense
        ? await updateExpense(expense.id, values)
        : await createExpense(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        expense ? "تم تحديث المصروف بنجاح" : "تم إضافة المصروف بنجاح",
      );
      close();
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={expense ? "تعديل المصروف" : "إضافة مصروف جديد"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>الفئة</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                value={EXPENSE_CATEGORY_LABELS[field.value] ?? field.value}
                onValueChange={(label) => {
                  if (!label) return;
                  const value = EXPENSE_CATEGORY_VALUE_BY_LABEL[label];
                  if (value) field.onChange(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={label}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-amount">المبلغ</Label>
          <Input
            id="expense-amount"
            type="number"
            min={0}
            step="0.01"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-date">التاريخ</Label>
          <Input id="expense-date" type="date" {...register("date")} />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-description">الوصف (اختياري)</Label>
          <Textarea
            id="expense-description"
            rows={3}
            {...register("description")}
          />
        </div>
        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={isPending}
        >
          {isPending ? "جاري الحفظ..." : ar.common.save}
        </Button>
      </form>
    </FormSheet>
  );
}
