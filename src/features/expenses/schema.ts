import { z } from "zod";
import { ar, invertLabels } from "@/i18n/ar";

export const EXPENSE_CATEGORY_LABELS: Record<string, string> =
  ar.statusLabels.expenseCategory;
export const EXPENSE_CATEGORY_VALUE_BY_LABEL = invertLabels(
  EXPENSE_CATEGORY_LABELS,
);

export const expenseSchema = z.object({
  category: z.enum([
    "RENT",
    "SALARIES",
    "TRANSPORTATION",
    "UTILITIES",
    "OTHER",
  ]),
  amount: z.coerce.number().min(0, { error: "المبلغ يجب أن يكون رقماً موجباً" }),
  description: z.string().optional(),
  date: z.string().min(1, { error: "الرجاء اختيار التاريخ" }),
});

export type ExpenseInput = z.input<typeof expenseSchema>;
export type ExpenseOutput = z.output<typeof expenseSchema>;
