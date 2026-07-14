import { z } from "zod";

export const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, { error: "اسم المنتج مطلوب" }),
  quantity: z.coerce
    .number()
    .int()
    .min(1, { error: "الكمية يجب أن تكون رقماً موجباً" }),
  unitPrice: z.coerce
    .number()
    .min(0, { error: "السعر يجب أن يكون رقماً موجباً" }),
});

export const invoiceSchema = z.object({
  language: z.enum(["AR", "FR"]),
  customerName: z
    .string()
    .min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" }),
  customerPhone: z.string().min(6, { error: "رقم الهاتف غير صحيح" }),
  customerEmail: z
    .union([z.email({ error: "البريد الإلكتروني غير صحيح" }), z.literal("")])
    .optional(),
  notes: z.string().optional(),
  quoteRequestId: z.string().optional(),
  items: z
    .array(invoiceItemSchema)
    .min(1, { error: "أضف منتجاً واحداً على الأقل" }),
});

export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoiceOutput = z.output<typeof invoiceSchema>;

export const INVOICE_LANGUAGE_LABELS: Record<string, string> = {
  AR: "العربية",
  FR: "Français",
};
