import { z } from "zod";
import { ar, invertLabels } from "@/i18n/ar";

export const createQuoteRequestSchema = z.object({
  customerName: z
    .string()
    .min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" }),
  phone: z.string().min(6, { error: "رقم الهاتف غير صحيح" }),
  email: z
    .union([z.email({ error: "البريد الإلكتروني غير صحيح" }), z.literal("")])
    .optional(),
  quantity: z.coerce
    .number()
    .int()
    .min(1, { error: "الكمية يجب أن تكون رقماً موجباً" }),
  notes: z.string().optional(),
  productId: z.string().optional(),
});

export type CreateQuoteRequestInput = z.input<typeof createQuoteRequestSchema>;
export type CreateQuoteRequestOutput = z.output<
  typeof createQuoteRequestSchema
>;

export const quoteResponseSchema = z.object({
  price: z.coerce.number().min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
  message: z.string().optional(),
});

export type QuoteResponseInput = z.input<typeof quoteResponseSchema>;
export type QuoteResponseOutput = z.output<typeof quoteResponseSchema>;

export const QUOTE_STATUS_LABELS: Record<string, string> =
  ar.statusLabels.quote;
export const QUOTE_STATUS_VALUE_BY_LABEL = invertLabels(QUOTE_STATUS_LABELS);
